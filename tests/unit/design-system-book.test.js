// The design system book — the Pro export.
//
// This is the paid deliverable, so the bar is not "it produced a file". Three
// things have to hold, and each has tests below:
//
//  1. It is CORRECT. Every figure in it is measured, and it measures the same
//     way the free style guide does — a book that disagrees with the guide
//     about a contrast ratio makes both untrustworthy.
//  2. It is ROBUST. Saved designs come from many tool versions. A half-written
//     one produces a shorter book, never a broken one, and never a page of
//     "undefined" in front of someone who paid for it.
//  3. It is GATED, and the gate fails closed. That one is asserted against
//     ExportPanel.jsx with comments stripped first — a sibling suite found a
//     test that passed only because a COMMENT above the code still named the
//     old value, so source assertions here never see comment text.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  buildDesignSystemBook, readBook, bookTokens,
} from '../../src/utils/designSystemBook.js'
import { contrast, grade } from '../../src/utils/styleGuideExport.js'
import { EXPORT_FORMATS } from '../../src/config/exportFormats.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
// Block comments AND line comments go before any assertion runs. A source
// assertion that can be satisfied by prose is not a test of the code.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/^\s*\/\/.*$/gm, ' ')

const DESIGN = {
  palette: {
    base: '#1F4B8E',
    harmony: 'analogous',
    colors: ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540'],
  },
  gradient: {
    stops: [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }],
    angle: 135,
    type: 'Linear',
  },
  fonts: {
    heading: { family: 'Space Grotesk', weight: 700 },
    body: { family: 'Inter', weight: 400 },
  },
  typeScale: { base: 16, ratio: 1.25, lineHeight: 1.55, headingSpacing: -0.02 },
}
const AT = new Date('2026-09-03T00:00:00Z')
const BOOK = buildDesignSystemBook(DESIGN, { projectName: 'Harbourline', date: AT })

const pageCount = (html) => (html.match(/<section class="pg[ "]/g) || []).length

/* ── 1 · it is a book, not a dump ────────────────────────────────────────── */

test('the book has the furniture that makes it a book', () => {
  // A cover, a contents, numbered section openings, and a running foot with a
  // folio. These four are most of what separates an artefact from a dump, so
  // losing any of them silently is the regression worth catching.
  assert.match(BOOK, /class="pg pg-cover"/, 'a cover')
  assert.match(BOOK, /class="pg pg-contents"/, 'a contents')
  assert.match(BOOK, /class="pg pg-open"/, 'section openings')
  assert.match(BOOK, /class="foot"/, 'a running foot')
  assert.match(BOOK, /class="folio"/, 'a printed page number')
})

test('it paginates to a real A4 book of a plausible length', () => {
  // The brand-manual convention the research settled on is 20-35pp for a full
  // identity; this covers three of its seven sections, so low double figures is
  // the honest range. Under 8 would mean sections silently vanished.
  const n = pageCount(BOOK)
  assert.ok(n >= 10 && n <= 20, `expected a 10-20 page book, got ${n}`)
  assert.match(BOOK, /@page\{size:A4;margin:0\}/, 'a true A4 print size')
  assert.match(BOOK, /width:210mm;height:297mm/, 'exact A4 pages')
})

test('the contents folios are the folios actually printed on the pages', () => {
  // The contents is generated from the same counter that prints the folio, so
  // the two cannot drift. This proves the counter really is shared.
  //
  // Section OPENINGS are counted but print no folio, which is ordinary book
  // practice — a chapter title page carries no page number. So the rule is:
  // every LEAF entry's folio must actually appear on a page.
  const leaves = [...BOOK.matchAll(/<li class="is-sub">[\s\S]*?<span class="ct-folio">(\d+)<\/span>/g)]
    .map(m => Number(m[1]))
  const printed = [...BOOK.matchAll(/<span class="folio">(\d+)<\/span>/g)].map(m => Number(m[1]))
  assert.ok(leaves.length >= 6, 'the contents lists the leaf pages, not just three sections')
  for (const f of leaves) {
    assert.ok(printed.includes(f), `contents lists page ${f} but no page prints that folio`)
  }
  // Folios ascend without repeating — the thing a hand-kept list gets wrong.
  assert.deepEqual(printed, [...printed].sort((a, b) => a - b), 'folios ascend')
  assert.equal(new Set(printed).size, printed.length, 'no folio is printed twice')
  // And an opening's folio is reserved rather than reused by the next page.
  // An opening is a top-level entry that carries a SECTION NUMBER — the
  // colophon is also top-level but is an ordinary printed page, so it is
  // identified by its empty number rather than by its nesting.
  const opens = [...BOOK.matchAll(
    /<span class="ct-num">(\d+)<\/span>[\s\S]*?<span class="ct-folio">(\d+)<\/span>/g,
  )].map(m => Number(m[2]))
  assert.equal(opens.length, 3, 'three numbered section openings')
  for (const f of opens) assert.ok(!printed.includes(f), `page ${f} is an opening and prints no folio`)
  // The colophon is top-level, unnumbered, and DOES print its folio.
  const colophon = BOOK.match(/<span class="ct-num"><\/span>\s*<span class="ct-title">Colophon<\/span>[\s\S]*?<span class="ct-folio">(\d+)<\/span>/)
  assert.ok(colophon, 'the colophon is listed at the top level, unnumbered')
  assert.ok(printed.includes(Number(colophon[1])), 'and prints its folio like any page')
})

test('every section opening is numbered and titled', () => {
  const nums = [...BOOK.matchAll(/<div class="open-num">(\d+)<\/div>/g)].map(m => m[1])
  assert.deepEqual(nums, ['01', '02', '03'])
  for (const title of ['Colour', 'Typography', 'Tokens']) {
    assert.ok(BOOK.includes(`<h2 class="open-title">${title}</h2>`), `${title} opens a section`)
  }
})

/* ── 2 · the content is real, and measured ──────────────────────────────── */

test('every colour states a role, a name and three notations', () => {
  // designsystems.com: a chip with a hex under it is not documentation. This is
  // the difference between a swatch grid and a specification.
  assert.match(BOOK, /PRIMARY/, 'the harmony-aware role label')
  assert.match(BOOK, /ANALOGOUS −30°/, 'roles follow the colour SYSTEM, not a fixed list')
  assert.match(BOOK, /<dt>HEX<\/dt><dd>#1F4B8E<\/dd>/)
  assert.match(BOOK, /<dt>RGB<\/dt><dd>31, 75, 142<\/dd>/)
  assert.match(BOOK, /<dt>HSL<\/dt><dd>216, 64%, 34%<\/dd>/)
  // The deterministic editorial name, not a hex repeated as a title.
  assert.match(BOOK, /class="bd-name">[A-Z][a-z]+ [A-Z][a-z]+</)
})

test('the contrast figures agree with the free style guide exactly', () => {
  // The book imports the guide's maths rather than reimplementing it. If the
  // two ever disagreed about a ratio, both documents become untrustworthy and
  // someone ships against the wrong one.
  const ratio = contrast('#1F4B8E', '#FFFFFF')
  assert.equal(ratio, 8.55)
  assert.ok(BOOK.includes(`${ratio}:1`), 'the band states the measured ratio')
  assert.ok(BOOK.includes(grade(ratio)), 'and the grade derived from it')
  // The matrix measures every pair, including against paper and ink.
  assert.match(BOOK, /class="mx"/)
  assert.ok(BOOK.includes(String(contrast('#1F4B8E', '#0D2540'))), 'a palette-to-palette pair is measured')
})

test('the matrix carries pass or fail in WEIGHT, never in colour', () => {
  // The colours on that page are the SUBJECT. A green or red cell would read as
  // a property of the swatch rather than of the measurement — and would also
  // collide with the brand fields the book is documenting.
  const css = BOOK.slice(BOOK.indexOf('<style>'), BOOK.indexOf('</style>'))
  assert.match(css, /\.mx-pass\{font-weight:700/)
  assert.match(css, /\.mx-fail\{font-weight:400/)
  assert.doesNotMatch(css, /\.mx-(pass|fail|mid)\{[^}]*(green|red|#0[a-f0-9]*[fF]0)/i,
    'no status hue may enter the matrix cells')
})

test('the type ladder is set in the real families at the specified sizes', () => {
  assert.match(BOOK, /Space Grotesk/, 'the heading family')
  assert.match(BOOK, /Inter/, 'the body family')
  assert.match(BOOK, /48\.8px/, 'the Display step at a 1.25 ratio from 16px')
  assert.match(BOOK, /3\.05rem/, 'and the same step in rem')
  // The specimen is CLAMPED so it cannot print cut in half. The first cut of
  // this shipped "Displa" and "Headin" at a 62px clamp.
  assert.match(BOOK, /font-size:44px/, 'the clamp is applied to the largest step')
  assert.match(BOOK, /Specimens above 44px are shown reduced/, 'and the book says so')
})

test('the gradient is specified so it can be rebuilt, not eyeballed', () => {
  // The copyable declaration, the stop table, and the angle stated in prose —
  // all three, because a gradient you cannot rebuild exactly is a picture.
  assert.match(BOOK, /linear-gradient\(135deg, #1F4B8E 0%, #3FA9A0 100%\)/)
  assert.match(BOOK, /background: linear-gradient\(135deg/, 'a copyable CSS declaration')
  assert.match(BOOK, /blend at 135°/, 'the angle is stated in the section lede')
  assert.match(BOOK, /<td class="num">#3FA9A0<\/td>\s*<td class="num">100%<\/td>/, 'every stop is specified')
})

test('the tokens are named for the ROLE, not the colour', () => {
  const tokens = bookTokens(readBook(DESIGN))
  const names = tokens.map(t => t.name)
  assert.ok(names.includes('--color-primary'), 'the primary is named by role')
  assert.ok(names.includes('--color-analogous-minus-30'), 'a signed slot keeps its sign')
  assert.ok(names.includes('--color-analogous-plus-30'), 'and the opposite sign is a DIFFERENT token')
  assert.ok(names.includes('--font-heading') && names.includes('--type-ratio'))
  assert.ok(names.includes('--gradient-brand'), 'the gradient is a token too')
  // A palette change must not orphan a name — no token is named after a hex.
  assert.ok(!names.some(n => /[0-9a-f]{6}/i.test(n)), 'no token is named after a colour value')
  assert.equal(new Set(names).size, names.length, 'token names are unique')
})

/* ── 3 · it never breaks in front of someone who paid ───────────────────── */

test('a half-written design produces a shorter book, never a broken one', () => {
  const cases = [
    undefined, null, {}, { palette: {} }, { palette: { colors: [] } },
    { palette: { colors: ['nonsense', '#GGGGGG', 42, null] } },
    { fonts: {}, typeScale: {} },
    { palette: { colors: ['#123456'], harmony: 'not-a-system' } },
    { gradient: { stops: [{ color: null, position: 0 }] } },
    { typeScale: { base: -5, ratio: 0, lineHeight: 'x' } },
  ]
  for (const design of cases) {
    const html = buildDesignSystemBook(design, { projectName: 'Untitled', date: AT })
    const label = JSON.stringify(design)
    assert.ok(html.startsWith('<!doctype html>'), `${label}: still a document`)
    assert.ok(!/undefined|NaN|\[object Object\]/.test(html), `${label}: leaked a placeholder`)
    assert.ok(pageCount(html) >= 5, `${label}: still a book`)
    // Always a cover and a colophon, whatever is missing from the system.
    assert.match(html, /class="pg pg-cover"/, `${label}: has a cover`)
    assert.match(html, /How this book was made/, `${label}: has a colophon`)
  }
})

test('a single colour does not produce a page carrying one stretched band', () => {
  // A plain chunk of six at five-per-page gives a page of five and a page of
  // ONE — a full page holding a single band, which is the most obviously
  // unfinished thing a book can do.
  const six = { ...DESIGN, palette: { ...DESIGN.palette, colors: ['#111111', '#222222', '#333333', '#444444', '#555555', '#666666'] } }
  const html = buildDesignSystemBook(six, { projectName: 'Six', date: AT })
  const perPage = html.split('<div class="bands">').slice(1)
    .map(chunk => (chunk.match(/class="bd"/g) || []).length)
  assert.deepEqual(perPage, [3, 3], 'six colours split evenly, not 5 + 1')
})

test('the book is self-contained: no script, no image, no stylesheet but fonts', () => {
  // The same guarantee its free sibling makes. The downloaded artefact must
  // work offline and must not execute anything.
  assert.ok(!/<script/i.test(BOOK), 'the artefact carries no script')
  assert.ok(!/<img/i.test(BOOK), 'and no image request')
  const links = [...BOOK.matchAll(/<link[^>]+href="([^"]+)"/g)].map(m => m[1])
  for (const href of links) {
    assert.match(href, /^https:\/\/fonts\.(googleapis|gstatic)\.com/,
      `the only external reference may be the user's own fonts, got ${href}`)
  }
})

test('the Pro book carries no watermark and has no degraded free variant', () => {
  // The free tier keeps the style guide, which carries its credit line. There
  // is deliberately no `watermark` option here: a gate that ships a worse paid
  // artefact teaches the user that the paid thing is worse.
  assert.ok(!/Made with UIL4B/.test(BOOK), 'the paid export is clean')
  const src = stripComments(read('src/utils/designSystemBook.js'))
  assert.ok(!/watermark/.test(src), 'the generator has no watermark option to get wrong')
})

test('the colophon states the boundary instead of filling it with placeholders', () => {
  // A full identity manual carries logo construction, imagery, tone of voice
  // and applied examples. This system holds none of them, so the book names
  // what it does not cover rather than inventing pages of it.
  assert.match(BOOK, /What it does not/)
  assert.match(BOOK, /logo\s*\n?\s*construction, imagery direction, tone of voice/)
  // "placeholders" is deliberately NOT in this list: the colophon's own honest
  // sentence uses the word, and a test that forbids naming the problem would
  // force the book to stop explaining itself.
  assert.ok(!/Lorem ipsum|TBD|Coming soon/i.test(BOOK), 'nothing is stubbed')
})

test('project names and font families cannot inject markup', () => {
  const html = buildDesignSystemBook(
    { ...DESIGN, fonts: { heading: { family: '"><script>x</script>' }, body: { family: 'Inter' } } },
    { projectName: '<img src=x onerror=alert(1)>', date: AT },
  )
  assert.ok(!/<script>x<\/script>/.test(html), 'a family name cannot open a tag')
  assert.ok(!/<img src=x/.test(html), 'nor can a project name')
  assert.match(html, /&lt;img src=x/, 'it is escaped and still printed')
})

/* ── 4 · the entitlement gate, asserted on comment-stripped source ──────── */

const PANEL = stripComments(read('src/components/ExportPanel.jsx'))

test('the book is a Pro format and the flag drives badge AND gate', () => {
  // The DECLARATION moved to src/config/exportFormats.js on 2026-09-05 so the
  // pricing page could read the same table the panel renders. Asserted as a
  // value rather than as source text, which is stronger than the regex it
  // replaces: `/id: 'book'[^}]*pro: true/` would have been satisfied by a
  // commented-out entry or a second array.
  const book = EXPORT_FORMATS.find((f) => f.id === 'book')
  assert.ok(book, 'the book format has been removed from the export table')
  assert.equal(book.pro, true, 'the format declares itself paid')
  assert.equal(book.live, true, 'a paid format that is not live is a promise of a file that cannot be made')

  // The CONSUMPTION stays here: one flag for both, so a format can never be
  // badged-but-ungated.
  assert.match(PANEL, /f\.pro && !isPro && <span className="exp-fmt-pro">Pro<\/span>/)
  assert.match(PANEL, /const locked = Boolean\(activeFormat\?\.pro\) && !isPro/)
  // …and the panel must still be rendering the table this test just inspected.
  assert.match(PANEL, /const FORMATS = EXPORT_FORMATS/,
    'ExportPanel no longer renders the shared table, so the flags asserted above drive nothing')
})

test('THE GATE FAILS CLOSED: it runs before the artefact is ever built', () => {
  // This is the test the whole feature rests on. The gate must be inside the
  // function that builds the file, not merely on the button — a relabelled
  // button is a hint, and runExport is reachable without it.
  const gate = PANEL.indexOf("?.pro && !isPro")
  assert.ok(gate > -1, 'runExport must check the paid flag against the live entitlement')

  const build = PANEL.indexOf("import('../utils/designSystemBook')")
  assert.ok(build > -1, 'the generator is loaded somewhere in this file')

  // ORDER IS THE ASSERTION. If the gate ever moves below the import, or is
  // deleted, a free user reaches the artefact and this goes red.
  assert.ok(gate < build,
    'the entitlement check must precede loading and running the book generator')

  // And it must bail rather than fall through. The wall goes
  // to /plans (every Pro CTA goes to /plans, never a
  // modal or a login popup).
  assert.match(PANEL.slice(gate, build), /navigate\('\/plans'\)\s*\n\s*return/,
    'the gate sends the viewer to /plans and returns without exporting')
})

test('the gate is NAMED so the funnel can say which wall converted', () => {
  // P-001: without a `gate` id, trackUpgradeGate falls back to the modal title,
  // which groups every wall in the product into one number.
  assert.match(PANEL, /gate: 'design-system-book-export'/)
})

test('the gate goes to /plans, and asks for no account first', () => {
  // A Pro CTA never opens a login popup or a modal, so
  // the entitlement check now precedes the account check.
  assert.ok(!/useProModal/.test(PANEL), 'the export wall must not raise the upgrade modal')
  const pro = PANEL.indexOf('?.pro && !isPro')
  const account = PANEL.indexOf('requireExportAccount(')
  assert.ok(pro > -1 && account > -1 && pro < account, 'the Pro gate must run before the account gate')
})

test('a free user is told what they are hitting before they click', () => {
  // P-003, the founder verdict: every gate EXPLICIT rather than silent. The
  // button says so itself, so the modal is a confirmation and not a surprise.
  assert.match(PANEL, /locked \? 'Unlock with Pro'/)
})

test('the book reports its own activation, not the style guide’s', () => {
  // Otherwise the paid deliverable is averaged into the free one and the single
  // number meant to say whether the product was useful stops distinguishing.
  assert.match(PANEL, /activation = 'design-system-book'/)
  assert.match(PANEL, /trackActivation\(activation, 'export'\)/)
})

test('the generator is loaded on demand, off the homepage JS budget', () => {
  assert.match(PANEL, /await import\('\.\.\/utils\/designSystemBook'\)/,
    'a static import would put the whole book in the main bundle')
})

test('the downloaded artefact never receives the print bootstrap', () => {
  // The no-script guarantee lives in the generator; the bootstrap is appended
  // only to the copy handed to the popup. If this ever moved into the module,
  // every downloaded book would carry executable code.
  const src = stripComments(read('src/utils/designSystemBook.js'))
  assert.ok(!/window\.print|<script/.test(src), 'the generator emits no script')
  assert.match(PANEL, /const printBook = \(html, filename\) => \{[\s\S]*?html\.replace\(/,
    'the bootstrap is applied in the panel, to a copy')
})
