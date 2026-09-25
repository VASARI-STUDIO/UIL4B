// THE BRAND GUIDELINES — the second Pro document.
//
// The bar is not "it produced a file". Four things have to hold:
//
//  1. IT IS A BRAND BOOK, not a landscape reprint of the design system book.
//     If the two documents converge, "multiple export variations" stops being
//     true and the second one stops being worth paying for.
//  2. IT IS HONEST. It contains a logo section only when there is a logo, it
//     never claims a reversed lockup it did not draw, it contains no
//     photography, and it says all of that on a page that is always present.
//  3. IT IS CORRECT AND ROBUST. Every ratio it prints is the one contrast()
//     computes — a document that disagrees with the book about a pair makes
//     both untrustworthy — and a half-written design produces a shorter
//     document, never a broken one, and never a page of "undefined" in front of
//     someone who paid for it.
//  4. IT IS WIRED. The generator existing is worth nothing if ExportPanel does
//     not call it, does not gate it, and does not offer the logo field beside
//     it. Those are asserted against the CALL SITE, with comments stripped
//     first — a sibling suite once found a test that passed only because a
//     comment still named the old value.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { buildBrandGuidelines, guidelineSections, readGuidelines } from '../../src/utils/brandGuidelines.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { contrast, inkFor } from '../../src/utils/styleGuideExport.js'
import { EXPORT_FORMATS, proOnlyFormats } from '../../src/config/exportFormats.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/\{\/\*[\s\S]*?\*\/\}/g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const PANEL = read('src/components/ExportPanel.jsx')

const DESIGN = {
  palette: {
    base: '#1F4B8E',
    harmony: 'analogous',
    colors: ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540'],
  },
  fonts: { heading: { family: 'Space Grotesk', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.55, headingSpacing: -0.02 },
}
const SVG = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 60"><rect width="240" height="60"/></svg>'
const LOGO = {
  src: `data:image/svg+xml;base64,${Buffer.from(SVG, 'utf8').toString('base64')}`,
  width: 240, height: 60, type: 'image/svg+xml', name: 'mark.svg',
}
const WITH_LOGO = { ...DESIGN, logo: LOGO }
const AT = new Date('2026-09-05T00:00:00Z')
const opts = { projectName: 'Harbourline', date: AT }

const DOC = buildBrandGuidelines(WITH_LOGO, opts)
const BARE = buildBrandGuidelines(DESIGN, opts)

const pageCount = (html) => (html.match(/<section class="sl[ "]/g) || []).length

/* ── 1 · it is a brand book, and not the other one ───────────────────────── */

test('it has the furniture that makes it a brand book', () => {
  // Cover, numbered section openings, a running rail with a folio, a rationale
  // beside every title, named swatches and alphabet grids. These are what the
  // founder's references are made of, and losing any of them silently is the
  // regression worth catching.
  assert.match(DOC, /class="sl sl-cover"/, 'a cover')
  assert.match(DOC, /class="sl sl-open"/, 'section openings')
  assert.match(DOC, /class="rail"/, 'a running rail')
  assert.match(DOC, /class="rail-folio"/, 'a printed page number')
  assert.match(DOC, /class="hd-notes"/, 'a rationale beside the page title')
  assert.match(DOC, /class="sw-name"/, 'swatches carrying a name, not only a hex')
  assert.match(DOC, /class="alpha"/, 'the boxed alphabet grid')
})

test('it is 16:9 and a plausible length', () => {
  const n = pageCount(DOC)
  assert.ok(n >= 10 && n <= 20, `expected a 10-20 page document, got ${n}`)
  assert.match(DOC, /@page\{size:297mm 167mm;margin:0\}/, 'a true 16:9 print size')
  assert.match(DOC, /width:297mm;height:167mm/, 'exact 16:9 pages')
})

test('it is not the design system book at another paper size', () => {
  // THE ASSERTION THAT KEEPS "MULTIPLE VARIATIONS" TRUE. If these two documents
  // ever converge, Pro is selling the same file twice. They are checked on the
  // three things that actually differ — page geometry, page furniture, and the
  // structures each one uses to present a colour.
  const BOOK = buildDesignSystemBook(WITH_LOGO, opts)
  assert.match(BOOK, /@page\{size:A4;margin:0\}/, 'the book is no longer A4 — one of these two has moved')
  assert.ok(!BOOK.includes('297mm;height:167mm'), 'the book has become landscape')
  assert.ok(!DOC.includes('210mm;height:297mm'), 'the guidelines have become A4 portrait')

  // The book's structures, absent here; and this document's, absent there.
  for (const marker of ['class="bd-chip"', 'class="mx"', 'class="pg pg-contents"']) {
    assert.ok(!DOC.includes(marker), `the guidelines have adopted the book's ${marker}`)
  }
  for (const marker of ['class="alpha"', 'class="rail"', 'class="op-field"']) {
    assert.ok(!BOOK.includes(marker), `the book has adopted the guidelines' ${marker}`)
  }
})

test('the sections are numbered from 01 with no gaps, whatever is present', () => {
  // A "02" under a chapter that does not exist is the clearest possible tell
  // that a fixed template had a piece removed. The numbering is therefore
  // decided AFTER the sections, and this proves it in both shapes.
  const nums = (html) => [...html.matchAll(/class="op-num">(\d+)</g)].map(m => Number(m[1]))
  const withLogo = nums(DOC)
  const bare = nums(BARE)
  assert.deepEqual(withLogo, [1, 2, 3], 'a design with a logo should open three numbered sections')
  assert.deepEqual(bare, [1, 2], 'without a logo the remaining sections must renumber from 01')
  assert.ok(DOC.includes('>01</span> Logo') || /op-num">01<\/span> Logo/.test(DOC))
  assert.match(BARE, /op-num">01<\/span> Colour/,
    'Colour is not 01 in a document with no logo section — the numbering has a hole in it')
})

test('the folios run 01..n with none missing and none repeated', () => {
  for (const [label, html] of [['with logo', DOC], ['bare', BARE]]) {
    const folios = [...html.matchAll(/class="rail-folio">(\d+)</g)].map(m => Number(m[1]))
    assert.ok(folios.length >= 5, `${label}: too few numbered pages to be a document`)
    assert.deepEqual(folios, folios.map((_, i) => i + 1), `${label}: the folio sequence is broken`)
  }
})

/* ── 2 · it is honest ────────────────────────────────────────────────────── */

test('there is no logo section unless there is a logo', () => {
  // POSITIVE CONTROL FIRST. "The document contains no logo pages" is trivially
  // true of a document that contains nothing, so the presence case is asserted
  // before the absence case and with the same markers.
  for (const marker of ['>The mark<', '>On grounds<', '>Clear space<', 'class="cs-box"', 'class="grounds"']) {
    assert.ok(DOC.includes(marker), `a design WITH a logo is missing ${marker} — the absence test below is vacuous`)
    assert.ok(!BARE.includes(marker), `a design with NO logo still renders ${marker}`)
  }
  assert.ok(!BARE.includes('<img'), 'a document with no logo still emits an image tag')
  assert.equal(pageCount(BARE) + 4, pageCount(DOC), 'the logo section is not four pages long any more')
})

test('the mark only ever appears as an <img> source, never as inline SVG markup', () => {
  // THE SECURITY LINE. The document is opened in a browser on a blob URL, so
  // inlining an uploaded SVG would let it carry script. An <img> is a replaced
  // element: script inside its source does not run and its external references
  // are not fetched. That is the browser's rule, and it only protects us while
  // the mark travels as a src.
  assert.ok(DOC.includes(`src="${LOGO.src}"`), 'the mark is not rendered from the stored data URI at all')
  const body = DOC.slice(DOC.indexOf('<body>'))
  assert.equal(/<svg(?![^>]*viewBox="0 0 24 24")/.test(body.replace(/src="data:image\/svg\+xml[^"]*"/g, '')), false,
    'an uploaded SVG has been inlined as markup — it can carry script in a document we open in a browser')
  // Every <img> the document emits is one of ours, pointed at a data: URI.
  const srcs = [...DOC.matchAll(/<img[^>]*\ssrc="([^"]*)"/g)].map(m => m[1])
  assert.ok(srcs.length >= 6, 'the mark is not being placed on the grounds page')
  for (const src of srcs) assert.ok(src.startsWith('data:image/'), `an <img> points at ${src}`)
})

test('it never claims a logo variant it did not draw', () => {
  // The references show the mark reversed to white on the dark tile. We place
  // the SAME artwork on every ground and say so. This is the sentence that turns
  // that page from a claim into a check, so it is pinned by name.
  assert.match(DOC, /No reversed or single-colour version has been generated/,
    'the grounds page no longer says the reversed lockup was not invented')
  assert.match(DOC, /reproduced without alteration/, 'the mark page no longer states that the artwork is unaltered')
  // And the recolouring itself must not have crept back in: the mark is emitted
  // with no fill, filter or colour override anywhere.
  assert.equal(/<img class="mk[^>]*(?:filter:|fill=|invert)/.test(DOC), false,
    'the mark is being recoloured — that invents a lockup nobody approved')
})

test('the scope page is always present and names what the document cannot contain', () => {
  for (const [label, html] of [['with logo', DOC], ['bare', BARE]]) {
    assert.ok(html.includes('class="sl sl-scope"'), `${label}: the scope page is missing`)
    assert.match(html, /Photographic applications/, `${label}: photography is not disclosed as absent`)
    assert.match(html, /Tone of voice, motion and iconography/, `${label}: the other absences are not named`)
    assert.match(html, /Not in this document/, `${label}: the absent column has no heading`)
  }
  // The absent list must actually DIFFER between the two shapes, or it is a
  // fixed paragraph rather than a description of the document in hand.
  assert.match(BARE, /A logo section/, 'a document with no logo does not say its logo section is missing')
  assert.ok(!DOC.includes('A logo section —'),
    'a document WITH a logo still lists the logo section as missing — the disclosure is boilerplate')
  assert.ok(BARE.includes('Add your logo in the export panel'),
    'the missing-logo line does not say how to fix it')
})

test('nothing in it is photography, and nothing in it is fetched', () => {
  // Self-contained by construction, like both sibling documents. The only
  // permitted network reference is the user's own webfont.
  const links = [...DOC.matchAll(/(?:src|href)="([^"]+)"/g)].map(m => m[1])
  for (const url of links) {
    const ok = url.startsWith('data:image/') || url.startsWith('https://fonts.googleapis.com') || url.startsWith('https://fonts.gstatic.com')
    assert.ok(ok, `the guidelines reference ${url} — the document must be self-contained but for the webfont`)
  }
  assert.ok(!/<script/i.test(DOC), 'the document carries script')
})

/* ── 3 · it is correct and robust ────────────────────────────────────────── */

test('every ratio it prints is the one contrast() computes', () => {
  // Shared maths, asserted rather than assumed. The guidelines and the book must
  // never state different figures for the same pair.
  let checked = 0
  for (const hex of DESIGN.palette.colors) {
    const { ratio } = inkFor(hex)
    assert.equal(ratio, contrast(hex, inkFor(hex).ink))
    assert.ok(DOC.includes(`${ratio}:1`), `the document does not print ${hex}'s measured ratio ${ratio}:1`)
    checked += 1
  }
  assert.equal(checked, 5, 'the loop stopped checking — the assertion above is not covering the palette')
})

test('the named swatches carry a name AND a hex, in the ink measured to read on them', () => {
  // The DSC move, and the difference between a value and a decision. Both halves
  // are asserted because a swatch with a name and no hex is as useless as the
  // reverse.
  for (const hex of DESIGN.palette.colors) {
    assert.ok(DOC.includes(`<dd>${hex}</dd>`), `${hex} has no printed value`)
  }
  const names = [...DOC.matchAll(/class="sw-name">([^<]+)</g)].map(m => m[1])
  assert.equal(names.length, 5, 'not every colour got a name')
  assert.equal(new Set(names).size, 5, 'two colours share a name')
  for (const hex of DESIGN.palette.colors) {
    assert.ok(DOC.includes(`background:${hex};color:${inkFor(hex).ink}`),
      `${hex}'s card is not set in the ink measured to read on it`)
  }
})

test('a half-written design produces a shorter document, never a broken one', () => {
  for (const design of [null, undefined, {}, { palette: {} }, { palette: { colors: [] } },
    { palette: { colors: ['nonsense', '#ABC'] } }, { fonts: {}, typeScale: {} },
    { logo: { src: 'javascript:alert(1)' } }]) {
    const html = buildBrandGuidelines(design, opts)
    assert.ok(!/undefined|NaN|\[object Object\]/.test(html),
      `a partial design printed a placeholder value: ${JSON.stringify(design)}`)
    assert.ok(html.includes('class="sl sl-scope"'), 'even an empty design keeps its scope page')
    assert.ok(pageCount(html) >= 3, 'a partial design produced almost nothing')
  }
  // Positive control: the FULL design produces materially more than the empty
  // one, so "it did not break" is not being satisfied by producing nothing.
  assert.ok(pageCount(DOC) > pageCount(buildBrandGuidelines({}, opts)) + 3)
})

test('the project name is escaped everywhere it is set', () => {
  const html = buildBrandGuidelines(DESIGN, { ...opts, projectName: '<script>alert(1)</script>&"' })
  assert.ok(!html.includes('<script>alert(1)'), 'the project name is not escaped')
  assert.ok(html.includes('&lt;script&gt;'), 'the name did not reach the document at all — the test is vacuous')
})

test('guidelineSections describes the document that is actually printed', () => {
  const withLogo = guidelineSections(readGuidelines(WITH_LOGO)).map(s => s.title)
  const bare = guidelineSections(readGuidelines(DESIGN)).map(s => s.title)
  assert.deepEqual(withLogo, ['Logo', 'Colour', 'Typography'])
  assert.deepEqual(bare, ['Colour', 'Typography'])
  // Typography survives an empty design; Colour does not, because there is no
  // palette to show. Both facts are the document's, not this test's.
  assert.deepEqual(guidelineSections(readGuidelines({})).map(s => s.title), ['Typography'])
})

/* ── 4 · it is wired ─────────────────────────────────────────────────────── */

test('the export table advertises it, and only because it is built', () => {
  const entry = EXPORT_FORMATS.find(f => f.id === 'guidelines')
  assert.ok(entry, 'the guidelines are not in the export table, so no surface can offer them')
  assert.equal(entry.live, true)
  assert.equal(entry.pro, true)
  assert.equal(entry.logo, true, 'the format no longer declares that it has logo pages')
  assert.ok(proOnlyFormats().some(f => f.id === 'guidelines'))
  // "Multiple export variations" is the founder's ask. It is only true while
  // Pro offers more than one document.
  assert.ok(proOnlyFormats().length >= 2,
    'Pro is back to a single export document — "multiple export variations" is no longer true')
})

test('ExportPanel actually calls the generator for this format', () => {
  // THE CALL SITE. Reverting the branch in ExportPanel must fail here — a test
  // that only exercises buildBrandGuidelines() would stay green while nothing
  // in the product could reach it.
  const code = stripComments(PANEL)
  assert.match(code, /format === 'guidelines'/, 'ExportPanel has no branch for the guidelines format')
  assert.match(code, /await import\('\.\.\/utils\/brandGuidelines'\)/,
    'ExportPanel no longer lazily imports the guidelines generator')
  assert.match(code, /buildBrandGuidelines\(design, \{ projectName \}\)/,
    'the generator is not being called with the saved design')
  assert.match(code, /activation = 'brand-guidelines'/,
    'the guidelines export reports under the book\'s activation name, so the two paid documents cannot be told apart')
  assert.match(code, /brand-guidelines\.html/, 'the file is not named after the document it is')
})

test('the paywall names the document the user clicked, not the other one', () => {
  const code = stripComments(PANEL)
  // The gate expression itself is pinned by tests/unit/plans-truth.test.js. What
  // is asserted here is that the COPY behind it is keyed per format — one shared
  // modal would describe a token manual to somebody buying a brand book.
  // The wall links to /plans instead of raising the modal, so what is keyed per format is the gate id it
  // reports — which is the half of this test that still means something.
  assert.match(code, /PRO_GATE\[format\]\?\.gate/, 'the export wall no longer reports its gate per format')
  for (const f of proOnlyFormats()) {
    assert.match(code, new RegExp(`\\n\\s{2}${f.id}: \\{`),
      `PRO_GATE has no entry for the Pro format "${f.id}" — clicking it opens an undefined modal`)
  }
  // Distinct analytics ids, or the funnel cannot say which wall converted.
  const gates = [...code.matchAll(/gate: '([^']+)'/g)].map(m => m[1])
  assert.ok(gates.length >= 2, 'the gate ids are no longer being parsed — this assertion has gone blind')
  assert.equal(new Set(gates).size, gates.length, 'two Pro documents report the same conversion gate')
})

test('the logo field is offered beside the format that needs it, and nowhere else', () => {
  const code = stripComments(PANEL)
  assert.match(code, /import BrandLogoField from '\.\/BrandLogoField'/, 'the logo field is not imported')
  assert.match(code, /\{activeFormat\?\.logo && <BrandLogoField \/>\}/,
    'the logo field is not gated on the format table\'s own `logo` flag — it is either always on, or gone')
  // The flag has to select something, or the gate above hides it for ever.
  assert.ok(EXPORT_FORMATS.some(f => f.logo), 'no format declares logo pages, so the field can never render')
  assert.ok(EXPORT_FORMATS.some(f => !f.logo), 'every format declares logo pages — the gate is not gating')
})

test('the panel writes the logo through the shared design store, not a second one', () => {
  // PR #389's rule, and the reason there is no new context here: the walkthrough,
  // the project card and this document all read one `design`.
  const field = stripComments(read('src/components/BrandLogoField.jsx'))
  assert.match(field, /useProject\(\)/, 'the logo field no longer reads the shared project store')
  assert.match(field, /updateDesign\(\{\s*logo:/, 'the logo is not written into `design`')
  assert.ok(!/localStorage|createContext|sessionStorage/.test(field),
    'BrandLogoField has grown a store of its own — the logo would then not travel with the project')
})

test('no grid in the document ends on an empty cell', () => {
  // fillRow(). Five colours in a three-wide grid leaves a hole in the second
  // row, and a hole at the end of a grid is the clearest signal that a machine
  // ran out of content. Asserted in both directions so it is measuring the
  // remainder rather than always spanning.
  const five = [...DOC.matchAll(/<div class="use( is-span\d)?"/g)].map(m => (m[1] || '').trim())
  assert.equal(five.length, 5)
  assert.deepEqual(five, ['', '', '', '', 'is-span2'], 'the five-tile grid does not close its second row')

  const six = buildBrandGuidelines(
    { ...DESIGN, palette: { ...DESIGN.palette, colors: [...DESIGN.palette.colors, '#7A3E9D'] } }, opts)
  const tiles = [...six.matchAll(/<div class="use( is-span\d)?"/g)].map(m => (m[1] || '').trim())
  assert.equal(tiles.length, 6)
  assert.ok(tiles.every(t => t === ''), 'a grid that already fills its rows is being spanned anyway')
})

test('the clear-space page draws the geometry it states', () => {
  // The one page that sets a rule rather than reporting a measurement, so the
  // drawing and the sentence have to agree — and the sentence has to admit it is
  // a default.
  assert.match(DOC, /X = ½ the height of the mark/, 'the rule is no longer printed')
  assert.match(DOC, /the default rule this document applies, not a decision already taken/,
    'the page no longer admits the rule is the document\'s default rather than the brand\'s')
  const box = /class="cs-box" style="width:([\d.]+)mm;height:([\d.]+)mm;padding:([\d.]+)mm"/.exec(DOC)
  assert.ok(box, 'the keep-out box is not drawn')
  const [, w, h, x] = box.map(Number)
  // 240x60 artwork at a 34mm mark height: X is half of 34, and the box is the
  // mark plus X on all four sides.
  assert.equal(x, 17)
  assert.equal(h, 34 + 2 * 17)
  assert.equal(Math.round(w), Math.round(34 * 4 + 2 * 17))
})
