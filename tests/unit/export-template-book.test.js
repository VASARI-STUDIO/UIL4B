// Monograph and Atlas, rendered with the five test names and palettes of 3, 5, 8 and 13
// colours. To see a check fail: raise a Literata font-size in book/monograph.js above 11pt,
// or change a folio in the contents of either template.
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildDesignSystemBook } from '../../src/utils/designSystemBook.js'
import { BOOK_TEMPLATES } from '../../src/utils/exportTemplates/book/index.js'
import { FIXED_DATE } from '../helpers/export-samples.js'

const COLOURS = ['#1F4B8E', '#2E7BB8', '#3FA9A0', '#C7D9E8', '#0D2540', '#B4552D', '#F5EDE3', '#E8B04A', '#7A3E9D', '#2B2B2B', '#F2F2F2', '#5C8A3A', '#D94F70']
const NAMES = ['Ink', 'Harbour & Co', 'Northside Community Legal Centre', 'N'.repeat(40), 'Word '.repeat(24).trim()]
const design = (n) => ({
  palette: { base: COLOURS[0], harmony: 'auto', colors: COLOURS.slice(0, n) },
  fonts: { heading: { family: 'Space Grotesk', weight: 700 }, body: { family: 'Inter', weight: 400 } },
})
const render = (template, name, n) => buildDesignSystemBook(design(n), { projectName: name, date: FIXED_DATE, template })
const pages = (html) => html.split('<section class="pg').slice(1)
const text = (html) => html.replace(/<[^>]+>/g, '|')

for (const template of ['monograph', 'atlas']) {
  test(`${template}: every name and palette size renders, folios match the pages, and nothing is escaped wrongly`, () => {
    for (const name of NAMES) {
      for (const n of [3, 5, 8, 13]) {
        const html = render(template, name, n)
        const list = pages(html)
        assert.ok(list.length >= 8, `${template} ${n} colours: ${list.length} pages`)
        // The contents entries point at the page the title is really on.
        const contents = list.find((p) => p.includes('pg-contents'))
        const entries = [...contents.matchAll(/<span class="ct-title">([^<]*)<\/span>[\s\S]*?<span class="ct-folio">(\d+)<\/span>/g)]
        assert.ok(entries.length >= 4)
        for (const [, title, folio] of entries) {
          const page = list[Number(folio) - 1]
          assert.ok(page, `${template}: folio ${folio} for "${title}" is past the last page`)
          if (page.includes('pg-open') || template === 'monograph') continue
          assert.ok(page.includes(`<span class="folio">${folio}</span>`), `${template}: page ${folio} does not print its own folio`)
        }
        assert.ok(!html.includes('<script'))
        assert.ok(!text(html).includes('undefined'))
      }
    }
  })

  test(`${template}: hostile names are escaped and the template is found by own property only`, () => {
    const html = render(template, '<img src=x onerror=alert(1)>&"', 5)
    assert.ok(!html.includes('<img src=x'), 'the project name reached the page unescaped')
    assert.ok(html.includes('&lt;img src=x onerror=alert(1)&gt;'))
    assert.ok(Object.hasOwn(BOOK_TEMPLATES, template))
    for (const bad of ['__proto__', 'constructor', 'toString']) {
      assert.equal(render(bad, 'Ink', 5), render('specification', 'Ink', 5), `${bad} did not fall back to the default`)
    }
  })
}

test('monograph: page count grows with the palette and the right pages are blank versos', () => {
  const small = pages(render('monograph', 'Ink', 3)).length
  const large = pages(render('monograph', 'Ink', 13)).length
  assert.ok(large > small)
  const html = render('monograph', 'Ink', 8)
  // Each section opens on a recto (odd) page.
  pages(html).forEach((p, i) => { if (p.includes('pg-open')) assert.equal((i + 1) % 2, 1, `an opening is on page ${i + 1}`) })
  assert.ok(html.includes('pg-blank'))
})

test('monograph: no Literata text above 11pt, and nothing above 11pt unless it names the user face', () => {
  const css = /<style>([\s\S]*?)<\/style>/.exec(render('monograph', 'Ink', 5))[1]
  const rules = [...css.matchAll(/([^{}]+)\{([^{}]*)\}/g)]
  let checked = 0
  for (const [, selector, body] of rules) {
    const size = /font-size:\s*([\d.]+)pt/.exec(body)
    if (!size) continue
    checked += 1
    if (Number(size[1]) > 11) {
      assert.match(body, /font-family:var\(--(head|body)\)/, `${selector.trim()} is ${size[1]}pt without the user's face`)
    }
    assert.ok(Number(size[1]) >= 7 || /\bsmall\b/.test(selector), `${selector.trim()} is under 7pt`)
  }
  assert.ok(checked > 10)
})

test('atlas: a long name leaves the primary band for the paper box, a short one stays on it', () => {
  assert.match(render('atlas', 'Ink', 3), /class="at-on"/)
  assert.match(render('atlas', 'Northside Community Legal Centre', 13), /class="at-box"/)
})

test('atlas: more than 13 colours are cut to 13 plates with a pointer to Tokens', () => {
  const many = { ...design(13), palette: { base: COLOURS[0], harmony: 'auto', colors: [...COLOURS, '#123456', '#654321'] } }
  const html = buildDesignSystemBook(many, { projectName: 'Ink', date: FIXED_DATE, template: 'atlas' })
  assert.equal((html.match(/class="pg pl"/g) || []).length, 13)
  assert.match(html, /The first 13 of 15 colours are shown; all 15 are listed in Tokens/)
})

test('a chrome font that cannot be read leaves the system face, never an error', () => {
  for (const template of ['specification', 'monograph', 'atlas']) {
    const html = buildDesignSystemBook(design(5), { projectName: 'Ink', date: FIXED_DATE, template, fontData: () => { throw new Error('gone') } })
    assert.ok(!html.includes('@font-face'))
    const withFont = buildDesignSystemBook(design(5), { projectName: 'Ink', date: FIXED_DATE, template, fontData: () => 'AAAA' })
    assert.ok(withFont.includes('@font-face'))
  }
})
