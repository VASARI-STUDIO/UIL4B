// The other export outputs say what the system is and stop, as the HTML books do
// (tests/unit/book-copy.test.js): the guidelines layouts, the PNG book, the UI kit
// layouts and the style guide in HTML, Markdown and PNG. The phrases are in
// tests/helpers/banned-copy.js. To see a check fail: put "rather than" back into a note in
// src/utils/exportTemplates/guidelines/notes.js, restore "How this book was made" in
// src/utils/bookRaster.js, or print a ratio with toFixed(1) in src/utils/brandGuidelines.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { buildBrandGuidelines } from '../../src/utils/brandGuidelines.js'
import { GUIDELINES_TEMPLATES } from '../../src/utils/exportTemplates/guidelines/index.js'
import { buildBookPages } from '../../src/utils/bookRaster.js'
import { renderUiKit } from '../../src/utils/uiKitExport.js'
import { buildStyleGuideHtml, buildStyleGuideMarkdown } from '../../src/utils/styleGuideExport.js'
import { buildStyleGuideLayout } from '../../src/utils/styleGuideRaster.js'
import { readLogo } from '../../src/utils/brandLogo.js'
import { SAMPLES, FIXED_DATE } from '../helpers/export-samples.js'
import { readKitTemplate } from '../helpers/export-golden.js'
import { BANNED, visibleText } from '../helpers/banned-copy.js'

const COLOURS = ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540', '#B4552D', '#F5EDE3', '#E8B04A', '#7A3E9D', '#2B2B2B', '#F2F2F2', '#5C8A3A', '#D94F70', '#123456', '#654321', '#ABCDEF', '#FEDCBA']
const design = (n, extra = {}) => ({
  palette: { base: COLOURS[0], harmony: 'analogous', colors: COLOURS.slice(0, n) },
  gradient: { stops: [{ color: '#1F4B8E', position: 0 }, { color: '#3FA9A0', position: 100 }], angle: 135, type: 'Linear' },
  fonts: { heading: { family: 'Space Grotesk', weight: 700 }, body: { family: 'Inter', weight: 400 } },
  typeScale: { base: 16, ratio: 1.333, lineHeight: 1.5 },
  ...extra,
})
// Every sample project plus palettes of 0, 1, 13 and 17 colours, so each count branch is read.
const DESIGNS = [...Object.entries(SAMPLES).map(([id, s]) => [id, s.design]), ...[0, 1, 13, 17].map((n) => [`${n} colours`, design(n)])]
const SAMPLE_LOGO_DESIGN = design(5, { logo: SAMPLES.halcyon.design.logo })
const assertClean = (text, label) => { for (const banned of BANNED) assert.doesNotMatch(text, banned, `${label}: ${banned}`) }

test('no guidelines layout carries a self-defending phrase', () => {
  assert.deepEqual(Object.keys(GUIDELINES_TEMPLATES).sort(), ['grid', 'poster', 'presentation'])
  for (const template of Object.keys(GUIDELINES_TEMPLATES)) {
    for (const [id, d] of [...DESIGNS, ['logo', SAMPLE_LOGO_DESIGN]]) {
      const html = buildBrandGuidelines(d, { projectName: 'Harbourline', date: FIXED_DATE, template })
      assertClean(visibleText(html), `guidelines ${template}, ${id}`)
    }
  }
})

test('the guidelines print every contrast ratio to two decimals, and count the type steps from the ladder', () => {
  for (const template of Object.keys(GUIDELINES_TEMPLATES)) {
    const html = buildBrandGuidelines(design(13), { projectName: 'Harbourline', date: FIXED_DATE, template })
    const ratios = [...visibleText(html).matchAll(/(\d+(?:\.\d+)?):1(?!\d)/g)].map((m) => m[1]).filter((r) => !['4.5', '3', '7'].includes(r))
    assert.ok(ratios.length >= 5, `${template}: found ${ratios.length} ratios`)
    for (const r of ratios) assert.match(r, /^\d+\.\d{2}$/, `${template}: "${r}:1" is not two decimals`)
  }
  const text = visibleText(buildBrandGuidelines(design(5), { projectName: 'Harbourline', date: FIXED_DATE, template: 'grid' }))
  assert.match(text, /8 steps on a 1\.333 ratio from a 16px base\./)
})

test('the PNG book carries no self-defending phrase in any line it draws', () => {
  for (const [id, d] of [...DESIGNS, ['logo', SAMPLE_LOGO_DESIGN]]) {
    for (const missingFonts of [[], ['Space Grotesk']]) {
      const book = buildBookPages(d, { projectName: 'Harbourline', date: FIXED_DATE, missingFonts })
      const all = book.pages.flatMap((p) => p.ops.filter((o) => o.op === 'text').map((o) => o.text)).join('\n')
      assertClean(all, `png book, ${id}`)
    }
  }
})

test('the PNG book names its colophon "Colophon" and states counts it computes', () => {
  const book = buildBookPages(design(5), { projectName: 'Harbourline', date: FIXED_DATE })
  const textOf = (kind) => book.pages.find((p) => p.kind === kind).ops.filter((o) => o.op === 'text').map((o) => o.text)
  assert.ok(textOf('colophon').includes('Colophon'))
  assert.ok(textOf('colophon').includes('Scope'))
  assert.ok(book.contents.some((e) => e.title === 'Colophon'))
  assert.match(textOf('contents').join(' '), /The colour, type and token specification for Harbourline\./)
  const opening = book.pages.find((p) => p.kind === 'opening')
  assert.match(opening.abstract, /^5 colours\. \d+ of \d+ pairs pass AA for text\.$/)
})

test('no UI kit layout carries a self-defending phrase in the text a reader sees', () => {
  for (const layout of ['studio', 'manual', 'showcase']) {
    const template = readKitTemplate(`src/templates/kit/${layout}.html`)
    for (const tier of ['free', 'pro']) {
      for (const [id, d] of DESIGNS) {
        const html = renderUiKit(d, { tier, template, logo: tier === 'pro' ? readLogo(d) : null, date: FIXED_DATE }).html
        assertClean(visibleText(html), `kit ${layout}/${tier}, ${id}`)
      }
    }
  }
})

test('the kit template files carry no banned phrase outside their CSS notes', () => {
  for (const layout of ['studio', 'manual', 'showcase']) {
    const source = fs.readFileSync(`src/templates/kit/${layout}.html`, 'utf8').replace(/\/\*[\s\S]*?\*\//g, '')
    assertClean(visibleText(source), `kit template ${layout}`)
  }
})

test('the style guide says what it holds in HTML, Markdown and PNG, with ratios to two decimals', () => {
  for (const [id, d] of DESIGNS) {
    const html = buildStyleGuideHtml(d, { projectName: 'Harbourline', date: FIXED_DATE })
    const md = buildStyleGuideMarkdown(d, { projectName: 'Harbourline', date: FIXED_DATE })
    const png = buildStyleGuideLayout(d, { projectName: 'Harbourline', date: FIXED_DATE }).filter((o) => o.op === 'text').map((o) => o.text).join('\n')
    assertClean(visibleText(html), `style guide html, ${id}`)
    assertClean(md, `style guide markdown, ${id}`)
    assertClean(png, `style guide png, ${id}`)
    for (const [label, text] of [['html', visibleText(html)], ['markdown', md], ['png', png]]) {
      for (const m of text.matchAll(/(\d+(?:\.\d+)?):1(?!\d)/g)) {
        if (['4.5', '3', '7'].includes(m[1])) continue
        assert.match(m[1], /^\d+\.\d{2}$/, `style guide ${label}, ${id}: "${m[0]}" is not two decimals`)
      }
    }
  }
})

// ── Slice 2: the dialog and gate copy make no claim the output cannot meet ───

test('no export copy line holds an em dash, an invented swatch name or a print-ready claim', async () => {
  const read = (p) => fs.readFileSync(p, 'utf8')
  const { EXPORT_FORMATS } = await import('../../src/config/exportFormats.js')
  const lines = [
    ...EXPORT_FORMATS.flatMap((f) => [f.name, f.desc, f.action]),
    ...[...read('src/hooks/useExportRunner.js').matchAll(/(?:subtitle|title): '([^']*)'|^\s+'([^'\n]*)',?$/gm)].map((m) => m[1] || m[2]),
    ...[...read('src/components/export/ExportSteps.jsx').matchAll(/blurb: '([^']*)'/g)].map((m) => m[1]),
  ].filter(Boolean)
  assert.ok(lines.length > 25, 'the copy read has gone blind')
  for (const line of lines) {
    assert.ok(!line.includes('\u2014'), `an em dash in export copy: ${line}`)
    assert.ok(!/Optic White/.test(line), `an invented swatch name: ${line}`)
    assert.ok(!/print-ready/i.test(line), `a print-ready claim the output cannot meet: ${line}`)
  }
})
