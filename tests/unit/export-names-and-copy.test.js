// THE THREE HOMEPAGE EXPORTS READ AS ONE SET.
//
// Someone flipping between the design system book, the brand deck and the UI
// kit saw three problems:
//
//  1. The kit named its near-black text colour #05070A "Warm Alabaster".
//     Alabaster is a near-white. A neutral has no hue for the hue filter to
//     compare, so colorName() drew from a pool that held both ends of the
//     lightness range. Words that name a lightness are now withheld from the
//     wrong end of it.
//  2. The kit's five colours differ from the book's and the deck's: the book
//     and the deck show the palette's own colours, the kit fills canvas and
//     text from the palette only when they qualify, otherwise from the primary's
//     tint scale. A derived slot now says so on its swatch.
//  3. Em dashes in the copy of the exports.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { colorName } from '../../src/utils/paletteNames.js'
import { renderUiKit, kitPalette, kitInk, derivedNoteFor, DERIVED_NOTE, CONTRAST_NOTE } from '../../src/utils/uiKitExport.js'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { buildStyleGuideHtml, buildStyleGuideMarkdown } from '../../src/utils/styleGuideExport.js'
import { buildStyleGuideHTML } from '../../src/utils/exportBuilder.js'
import { buildTokensCss, buildTokensJson } from '../../src/utils/designTokens.js'
import { describeKey } from '../../src/utils/dataExport.js'

const hex2 = (n) => n.toString(16).padStart(2, '0').toUpperCase()
const grey = (v) => `#${hex2(v)}${hex2(v)}${hex2(v)}`
const nounOf = (name) => name.split(' ').pop()

// Written out here, a second copy of the source's idea on purpose.
const LIGHT_ONLY = ['Alabaster', 'Bone', 'Chalk', 'Plaster', 'Vellum', 'Parchment', 'Gesso', 'Oatmeal', 'Limestone']
const DARK_ONLY = ['Basalt', 'Graphite', 'Gunmetal', 'Carbon']

test('the near-black from the report is no longer called Alabaster', () => {
  const name = colorName('#05070A')
  assert.doesNotMatch(name, /Alabaster/, `#05070A is named "${name}"`)
  assert.ok(!LIGHT_ONLY.includes(nounOf(name)), `#05070A is named with a near-white word: "${name}"`)
})

test('no dark grey or tinted near-black draws a word for white, and no light one a word for black', () => {
  const offenders = []
  for (let v = 0; v <= 255; v += 1) {
    for (const hex of [grey(v), `#${hex2(v)}${hex2(Math.min(255, v + 3))}${hex2(Math.min(255, v + 6))}`]) {
      const noun = nounOf(colorName(hex))
      if (v <= 70 && LIGHT_ONLY.includes(noun)) offenders.push(`${hex} ${noun}`)
      if (v >= 190 && DARK_ONLY.includes(noun)) offenders.push(`${hex} ${noun}`)
    }
  }
  assert.deepEqual(offenders.slice(0, 10), [], `${offenders.length} neutrals named against their lightness`)
})

// The source's tone ranges (CIE L*, 0 black to 100 white), written out again so
// a range that drifts in the source is not agreed with by its own test.
const NOUN_TONE = {
  Alabaster: [75, 100], Bone: [70, 100], Chalk: [75, 100], Plaster: [70, 100],
  Oatmeal: [65, 96], Limestone: [65, 96], Vellum: [75, 100], Parchment: [75, 100],
  Gesso: [75, 100], Travertine: [55, 92],
  Concrete: [35, 82], Greige: [45, 88], Pewter: [30, 78], Titanium: [35, 82],
  Steel: [30, 80], Alloy: [30, 80], Chrome: [50, 100],
  Basalt: [0, 45], Graphite: [0, 50], Gunmetal: [0, 50], Carbon: [0, 40],
}
// L* of a grey, from the CIE definition (not from the code under test).
const toneOfGrey = (v) => {
  const c = v / 255
  const y = c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4
  return y > 216 / 24389 ? 116 * Math.cbrt(y) - 16 : (24389 / 27) * y
}
// A sentence naming the fault, or null when the grey's name fits its tone.
const misnamed = (v) => {
  const noun = nounOf(colorName(grey(v)))
  const range = NOUN_TONE[noun]
  const tone = toneOfGrey(v)
  return range && (tone < range[0] || tone > range[1])
    ? `${grey(v)} tone ${tone.toFixed(1)} is named ${noun}, which needs ${range[0]} to ${range[1]}`
    : null
}

test('every grey from 0 to 255 draws only a word whose tone range holds it', () => {
  const offenders = []
  for (let v = 0; v <= 255; v += 1) {
    const bad = misnamed(v)
    if (bad) offenders.push(bad)
  }
  assert.deepEqual(offenders.slice(0, 10), [], `${offenders.length} greys named outside their word's range`)
})

// An 8-bit grey never lands exactly on a range edge, so test the greys either
// side of each edge that matters, and a few neighbours.
for (const edge of [45, 50, 65, 75]) {
  test(`greys either side of tone ${edge} are named for the side they are on`, () => {
    const tones = Array.from({ length: 256 }, (_, v) => toneOfGrey(v))
    const below = tones.findLastIndex((t) => t <= edge)
    const above = tones.findIndex((t) => t > edge)
    assert.ok(below >= 0 && above > below, `no greys straddle tone ${edge}`)
    const offenders = []
    for (let v = Math.max(0, below - 3); v <= Math.min(255, above + 3); v += 1) {
      const bad = misnamed(v)
      if (bad) offenders.push(bad)
    }
    assert.deepEqual(offenders, [], `a grey near tone ${edge} is named against its lightness`)
  })
}

test('the guard is not achieved by emptying the pool', () => {
  // Positive control: the light end still draws light words, the dark end dark
  // ones, and the names still vary across the ramp.
  const lights = new Set()
  const darks = new Set()
  for (let v = 0; v < 256; v += 1) {
    if (v >= 235) lights.add(nounOf(colorName(grey(v))))
    if (v <= 25) darks.add(nounOf(colorName(grey(v))))
  }
  assert.ok([...lights].some((n) => LIGHT_ONLY.includes(n)), `light greys never draw a light word: ${[...lights]}`)
  assert.ok([...darks].some((n) => DARK_ONLY.includes(n)), `dark greys never draw a dark word: ${[...darks]}`)
  const ramp = []
  for (let v = 0; v < 256; v += 8) ramp.push(colorName(grey(v)))
  assert.ok(new Set(ramp).size >= 12, `only ${new Set(ramp).size} distinct names across the grey ramp`)
})

test('a name is still a pure function of the colour', () => {
  for (const hex of ['#05070A', '#F5F3EE', '#2F6B5A']) assert.equal(colorName(hex), colorName(hex.toLowerCase()))
})

// ── the kit's derived colours are labelled ──────────────────────────────────

const FULL = Object.freeze({
  palette: { base: '#2F6B5A', harmony: 'auto', colors: ['#2F6B5A', '#8C6BB1', '#E3B23C', '#EEF3EE', '#1B2A26'] },
  fonts: { heading: { family: 'Space Grotesk', weight: 600, category: 'sans-serif' }, body: { family: 'Work Sans', weight: 400, category: 'sans-serif' } },
  typeScale: { base: 16, ratio: 1.333, lineHeight: 1.6 },
})
// Positions 4 and 5 are mid-tone, so neither can be the canvas or the text.
const SOFT = Object.freeze({ ...FULL, palette: { ...FULL.palette, colors: ['#2F6B5A', '#8C6BB1', '#E3B23C', '#5C9A86', '#2F8A6A'] } })
const OFL = { name: 'SIL Open Font License', text: 'Copyright\nSIL OPEN FONT LICENSE Version 1.1' }
const FONTS = {
  'Space Grotesk': { faces: [{ base64: 'U1BBQ0U=', format: 'woff2', weight: '300 700', unicodeRange: 'U+0000-00FF' }], license: OFL },
  'Work Sans': { faces: [{ base64: 'V09SSw==', format: 'woff2', weight: '100 900', unicodeRange: 'U+0000-00FF' }], license: OFL },
}
const TEMPLATE = fs.readFileSync(path.join(process.cwd(), 'src/templates/kit/studio.html'), 'utf8')
const kit = (design) => renderUiKit(design, {
  template: TEMPLATE, fonts: FONTS, tier: 'free', date: new Date('2026-01-02T00:00:00Z'),
  publisherFonts: [{ family: 'Geist', axis: '300 700', faces: [{ subset: 'latin', base64: 'R0VJU1Q=' }] }],
  publisherLicense: 'Geist licence text',
}).html
const swatchBlocks = (html) => [...html.matchAll(/<article class="swatch(?: is-primary)?">[\s\S]*?<\/article>/g)].map((m) => m[0])

test('a kit whose five colours are all the palette\'s own says nothing about derivation', () => {
  const slots = kitPalette(FULL)
  assert.ok(slots.every((p) => p.derived === false), 'a palette colour was marked derived')
  const html = kit(FULL)
  assert.equal(swatchBlocks(html).length, 5)
  assert.ok(!html.includes(DERIVED_NOTE), 'the derived note shows when nothing was derived')
})

test('a canvas and text the palette could not supply are marked derived on their swatches', () => {
  const slots = Object.fromEntries(kitPalette(SOFT).map((p) => [p.id, p]))
  assert.equal(slots.chalk.derived, true, 'the canvas is derived from the primary here')
  assert.equal(slots.pine.derived, false)
  assert.equal(slots.lilac.derived, false)
  assert.equal(slots.citron.derived, false)
  const html = kit(SOFT)
  const blocks = swatchBlocks(html)
  const derivedIds = kitPalette(SOFT).filter((p) => p.derived)
  assert.ok(derivedIds.length >= 1)
  // Exactly the derived swatches carry the note, and the palette's own do not.
  assert.equal(blocks.filter((b) => b.includes(DERIVED_NOTE)).length, derivedIds.length)
  for (const p of kitPalette(SOFT)) {
    const block = blocks.find((b) => b.includes(`data-copy="${p.hex}"`))
    assert.ok(block, `${p.id} ${p.hex} has no swatch`)
    assert.equal(block.includes(DERIVED_NOTE), p.derived, `${p.id}: the note and the flag disagree`)
    assert.equal(block.includes(DERIVED_NOTE), p.derivedNote === DERIVED_NOTE, `${p.id}: the swatch does not say what the slot says`)
  }
})

test('the kit\'s text colour is named for its lightness, in the document itself', () => {
  const slots = Object.fromEntries(kitPalette({ palette: { colors: ['#0051FF'] } }).map((p) => [p.id, p]))
  for (const id of ['chalk', 'ink']) {
    const noun = nounOf(slots[id].name)
    if (id === 'ink') assert.ok(!LIGHT_ONLY.includes(noun), `the text colour ${slots.ink.hex} is named "${slots.ink.name}"`)
    if (id === 'chalk') assert.ok(!DARK_ONLY.includes(noun), `the canvas ${slots.chalk.hex} is named "${slots.chalk.name}"`)
  }
})

test('a text colour set to plain black or white says so, not that it came from the primary', () => {
  // No dark stop on the primary's scale, which the saved tint settings never
  // produce, so the choice is tested directly.
  const midScale = { 950: '#8A8A8A', 900: '#9A9A9A' }
  const onLight = kitInk(['#2F6B5A'], midScale, '#EEF3EE')
  assert.equal(onLight.hex, '#000000')
  assert.equal(onLight.index, null)
  assert.equal(derivedNoteFor(onLight), CONTRAST_NOTE)
  assert.equal(CONTRAST_NOTE, 'Set to black or white for contrast.')
  assert.notEqual(CONTRAST_NOTE, DERIVED_NOTE)
  // Mid-greys that fail on a light canvas read well on a dark one, so use darker ones.
  const onDark = kitInk(['#2F6B5A'], { 950: '#5A5A5A', 900: '#606060' }, '#101418')
  assert.equal(onDark.hex, '#FFFFFF')
  assert.equal(derivedNoteFor(onDark), CONTRAST_NOTE)
})

test('the other two routes to a text colour keep their own notes', () => {
  const scale = { 950: '#0A1A14', 900: '#12281F' }
  const own = kitInk(['#2F6B5A', '#8C6BB1', '#E3B23C', '#EEF3EE', '#1B2A26'], scale, '#EEF3EE')
  assert.equal(own.hex, '#1B2A26')
  assert.equal(derivedNoteFor(own), null, 'a palette colour carries no derivation note')
  const fromScale = kitInk(['#2F6B5A'], scale, '#EEF3EE')
  assert.equal(fromScale.hex, '#0A1A14')
  assert.equal(derivedNoteFor(fromScale), DERIVED_NOTE)
  // And through the real palette: a derived text colour reads the primary note.
  const ink = kitPalette(SOFT).find((p) => p.id === 'ink')
  assert.equal(ink.derivedNote, ink.derived ? DERIVED_NOTE : null)
})

// ── no em dashes in the export copy ─────────────────────────────────────────

const EM = '—'
// The documents' own stylesheets and scripts are not copy.
const copyOf = (html) => html
  .replace(/<style[\s\S]*?<\/style>/g, '')
  .replace(/<script[\s\S]*?<\/script>/g, '')

const PRO = { projectName: 'Harbour', date: new Date('2026-01-02T00:00:00Z') }

test('no export writes an em dash into its copy', () => {
  const docs = {
    'design system book': buildDesignSystemBook(FULL, PRO),
    'brand deck': buildBrandGuidelines(FULL, PRO),
    'brand deck, no palette': buildBrandGuidelines({}, PRO),
    'style guide': buildStyleGuideHtml(FULL, PRO),
    'style guide, no palette': buildStyleGuideHtml({}, PRO),
    'style guide markdown': buildStyleGuideMarkdown(FULL, PRO),
    'style guide markdown, no palette': buildStyleGuideMarkdown({}, PRO),
    'ui kit': kit(FULL),
    'ui kit, derived colours': kit(SOFT),
    'tint style guide': buildStyleGuideHTML({ design: FULL, projectName: 'Harbour', watermark: true }),
    'token CSS, free': buildTokensCss(FULL, { projectName: 'Harbour', watermark: true }),
    'token CSS, pro': buildTokensCss(FULL, { projectName: 'Harbour', watermark: false }),
    'token JSON, free': buildTokensJson(FULL, { projectName: 'Harbour', watermark: true }),
    'data export, an undescribed key': JSON.stringify(describeKey('vs-something-new')),
  }
  const offenders = Object.entries(docs)
    .map(([name, html]) => [name, [...copyOf(html).matchAll(new RegExp(`.{0,40}${EM}.{0,40}`, 'g'))].map((m) => m[0])])
    .filter(([, hits]) => hits.length)
  assert.deepEqual(offenders, [], 'an export still has an em dash in its copy')
})

test('an empty value reads "None", not a lone dash', () => {
  const docs = {
    'style guide, no palette': buildStyleGuideHtml({}, PRO),
    'style guide markdown, no palette': buildStyleGuideMarkdown({}, PRO),
    'design system book, no palette': buildDesignSystemBook({}, PRO),
  }
  for (const [name, doc] of Object.entries(docs)) {
    const copy = copyOf(doc)
    assert.doesNotMatch(copy, />\s*–\s*</, `${name} still prints a lone dash as a value`)
    assert.doesNotMatch(copy, /\|\s*–\s*\|/, `${name} still prints a lone dash in a table cell`)
  }
  assert.match(docs['style guide markdown, no palette'], /\| Primary \| None \|/)
  assert.match(docs['style guide, no palette'], /<dt>Primary<\/dt><dd>None<\/dd>/)
  assert.match(docs['design system book, no palette'], /<dt>Primary<\/dt><dd>None<\/dd>/)
})

test('the contents line on the book no longer has the dash from the report', () => {
  const book = buildDesignSystemBook(FULL, PRO)
  assert.match(book, /<p>The colour, type and token specification for <b>Harbour<\/b>\.<\/p>/)
})
