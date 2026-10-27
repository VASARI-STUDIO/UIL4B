// The UI kit's three layouts (Studio, Manual, Showcase), rendered through renderUiKit
// from src/templates/kit/<layout>.html. Each check is on the document a person gets.
// KIT_TEMPLATES_DIR points the layouts at another folder (a scratch copy for mutation runs); unset, the real templates are read.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { renderUiKit, KIT_CHROME } from '../../src/utils/uiKitExport.js'
import { SELF_HOSTED, loadPublisherFonts } from '../../src/utils/kitFonts.js'

const read = (p) => fs.readFileSync(path.resolve(process.cwd(), p), 'utf8')
const LAYOUTS = ['studio', 'manual', 'showcase']
const TEMPLATE = Object.fromEntries(LAYOUTS.map((id) => [id, read(`${process.env.KIT_TEMPLATES_DIR || 'src/templates/kit'}/${id}.html`)]))
const DATE = new Date('2026-01-02T00:00:00Z')
const OFL = { name: 'SIL Open Font License', text: 'SIL OPEN FONT LICENSE Version 1.1' }
const FONTS = {
  'Space Grotesk': { faces: [{ base64: 'U1BBQ0U=', format: 'woff2', weight: '300 700' }], license: OFL },
  'Work Sans': { faces: [{ base64: 'V09SSw==', format: 'woff2', weight: '100 900' }], license: OFL },
}
const BASE = ['#2F6B5A', '#8C6BB1', '#E3B23C', '#EEF3EE', '#1B2A26']
const design = (colors = BASE, extra = {}) => ({
  palette: { base: colors[0], harmony: 'auto', colors },
  fonts: { heading: { family: 'Space Grotesk', weight: 600 }, body: { family: 'Work Sans', weight: 400 } },
  ...extra,
})
const render = (layout, d, tier = 'free') => renderUiKit(d, {
  template: TEMPLATE[layout], tier, fonts: FONTS, date: DATE,
  publisherFonts: [{ family: 'Geist', axis: '300 700', faces: [{ subset: 'latin', base64: 'R0VJU1Q=' }] }], publisherLicense: 'Geist licence',
}).html
const count = (text, needle) => text.split(needle).length - 1
// 15 distinct, well-spread colours: the kit shows 13.
const FIFTEEN = [...BASE, '#C0392B', '#2980B9', '#27AE60', '#8E44AD', '#D35400', '#16A085', '#7F8C8D', '#F39C12', '#34495E', '#E91E63']

test('every layout renders with no placeholder left, Free and Pro', () => {
  for (const layout of LAYOUTS) {
    for (const tier of ['free', 'pro']) {
      for (const colors of [['#0051FF'], BASE, FIFTEEN]) {
        const html = render(layout, design(colors, { identity: { name: 'Harbour', description: 'Moorings.' } }), tier)
        assert.ok(!/@@[A-Z][A-Z0-9_]*@@/.test(html), `${layout}/${tier}/${colors.length}: a placeholder is left`)
      }
    }
  }
  assert.throws(() => renderUiKit(design(), { template: '@@DATA@@ @@NOT_A_KEY@@' }), /Unresolved UI kit placeholder @@NOT_A_KEY@@/)
})

test('Free carries the mark in every section and the print credit, and Pro carries none', () => {
  for (const layout of LAYOUTS) {
    const free = render(layout, design(), 'free')
    const sections = count(TEMPLATE[layout], '@@WATERMARK@@')
    assert.ok(sections >= 4, `${layout}: the template marks its sections`)
    assert.equal(count(free, '<span class="section-watermark">Made with <a class="publisher-link"'), sections, `${layout}: one mark per section`)
    assert.match(free, /@bottom-left \{ content:"Made with UIL4B \/ Free UI kit"/)
    assert.match(free, /<aside class="site-links">/)
    const pro = render(layout, design(BASE, { identity: { name: 'Harbour' } }), 'pro')
    for (const marker of ['class="section-watermark"', 'class="free-notice"', 'class="site-links"', 'class="publisher-link"', 'Made with UIL4B', 'uil4b.com']) {
      assert.ok(!pro.includes(marker), `${layout}: a Pro kit still carries ${marker}`)
    }
    assert.match(pro, /@page \{ @bottom-right/)
  }
})

test('the templates hold no hex colour: every colour is a token the renderer fills (Manual and Showcase)', () => {
  for (const layout of ['manual', 'showcase']) {
    const hits = TEMPLATE[layout].match(/#[0-9a-fA-F]{3,8}\b/g) || []
    assert.deepEqual(hits.filter((h) => /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/.test(h) && /\d/.test(h)), [], `${layout} has a raw hex`)
  }
})

test('a project name holding a placeholder or a replacement pattern stays literal text', () => {
  const name = '@@TOKEN_CSS@@ $& $1 @@DATA@@'
  for (const layout of LAYOUTS) {
    const html = render(layout, design(BASE, { identity: { name } }), 'pro')
    assert.ok(html.includes(name.replace(/&/g, '&amp;')), `${layout}: the name is shown literally`)
    assert.equal(count(html, ':root {\n  --color-citron:'), 1, `${layout}: the token block was filled once and not again inside the name`)
    assert.equal(count(html, 'id="brand-data"'), 1, `${layout}: the data block was filled once`)
  }
})

test('a design with more than 13 colours says it shows the first 13 of N, in every layout; 13 says nothing', () => {
  const note = 'The first 13 of 15 colours are'
  for (const layout of LAYOUTS) {
    assert.ok(render(layout, design(FIFTEEN)).includes(note), `${layout}: the note is missing`)
    assert.ok(!render(layout, design(FIFTEEN.slice(0, 13))).includes('The first 13 of'), `${layout}: a note with nothing cut`)
  }
})

test('Manual shows no sample for a pair under 3:1, "Large text only" from 3 to 4.5, and a body sample above', () => {
  const row = (html, label) => new RegExp(`<tr><th scope="row"><span class="nm"><b>${label}</b>[\\s\\S]*?</tr>`).exec(html)[0]
  // A pale yellow primary on its pale canvas: well under 3:1.
  const pale = row(render('manual', design(['#F2E58C'])), 'Primary on canvas')
  assert.match(pale, /No sample: below 3:1/)
  assert.ok(!pale.includes('class="smp'), 'a failing pair was drawn')
  assert.match(pale, /<small>Fails AA<\/small>/)
  const dark = row(render('manual', design()), 'Primary on canvas')
  assert.match(dark, /<span class="smp" style="[^"]*"><b>Aa<\/b> Body text<\/span>/)
  // #4A8BC9 on a white canvas is 3.60:1.
  const mid = row(render('manual', design(['#4A8BC9', '#8C6BB1', '#E3B23C', '#FFFFFF', '#1B2A26'])), 'Primary on canvas')
  assert.match(mid, /smp large/)
  assert.match(mid, /Large text only/)
})

test('Studio: the contents nav lists the sections in the order they appear, and every other layout does too', () => {
  for (const layout of LAYOUTS) {
    for (const tier of ['free', 'pro']) {
      const html = render(layout, design(BASE, { identity: { name: 'Harbour' } }), tier)
      const nav = /<div class="nav-links">([\s\S]*?)<\/div>/.exec(html)[1]
      const targets = [...nav.matchAll(/href="#([a-z-]+)"/g)].map((m) => m[1])
      assert.ok(targets.length >= 6, `${layout}: a contents list`)
      const at = targets.map((id) => html.indexOf(`id="${id}"`))
      assert.ok(at.every((n) => n > 0), `${layout}: a link names a section that is not there`)
      assert.deepEqual([...at].sort((a, b) => a - b), at, `${layout}/${tier}: the links run in a different order from the sections`)
    }
  }
  const studio = /<nav class="shell section-nav"[\s\S]*?<\/nav>/.exec(render('studio', design()))[0]
  const ids = [...render('studio', design()).matchAll(/<section[^>]* id="([a-z-]+)"/g)].map((m) => m[1])
  assert.deepEqual([...studio.matchAll(/href="#([a-z-]+)"/g)].map((m) => m[1]), ids, 'Studio: the nav is the section list')
})

test('Studio: a swatch at 0.75 luminance or more is pale (hairline); one just under is not', () => {
  // Relative luminance, hand-checked: #E0E0E0 = 0.745, #E2E2E2 = 0.760.
  const html = render('studio', design([...BASE, '#E0E0E0', '#E2E2E2']))
  const chip = (hex) => new RegExp(`<button class="colour-chip( pale)?" style="--swatch:${hex};`).exec(html)
  assert.equal(chip('#E0E0E0')[1], undefined, '0.745 is not pale')
  assert.equal(chip('#E2E2E2')[1], ' pale', '0.760 is pale')
  assert.equal(chip('#2F6B5A')[1], undefined, 'a dark swatch is not pale')
})

test('Studio: a colour at 1.3:1 on the canvas reads "Fails AA" in words, and one that passes reads its grade', () => {
  // #D2D7D2 on the #EEF3EE canvas is 1.30:1.
  const html = render('studio', design([...BASE, '#D2D7D2']))
  const failing = /data-copy="#D2D7D2"[^>]*><span>[^<]*<\/span><span class="chip-result"><b class="chip-grade fails">Fails AA<\/b><small>(\d\.\d\d):1 as text on the canvas<\/small>/.exec(html)
  assert.ok(failing, 'the failing chip says so in words')
  assert.equal(failing[1], '1.30', 'the ratio is shown to two places')
  assert.match(html, /<b class="chip-grade">AAA<\/b>/, 'the text colour on the canvas passes at the top grade')
})

test('each layout loads its own chrome faces, all self-hosted, and loadPublisherFonts reads only the families asked for', async () => {
  for (const [layout, families] of Object.entries(KIT_CHROME)) {
    assert.ok(LAYOUTS.includes(layout))
    for (const family of families) assert.ok(SELF_HOSTED[family], `${layout}: ${family} is not self-hosted`)
  }
  const asked = []
  const fetch = async (url) => { asked.push(url); return { ok: true, arrayBuffer: async () => new TextEncoder().encode('x').buffer, text: async () => 'licence' } }
  const out = await loadPublisherFonts({ fetch, families: KIT_CHROME.manual })
  assert.deepEqual(out.publisherFonts.map((f) => f.family), ['Hanken Grotesk', 'Martian Mono'])
  assert.ok(asked.every((u) => /hanken|martian|HANKEN|MARTIAN/.test(u)), `an unrelated font was fetched: ${asked.join(' ')}`)
  const dflt = await loadPublisherFonts({ fetch })
  assert.deepEqual(dflt.publisherFonts.map((f) => f.family), ['Geist', 'Geist Mono'])
})
