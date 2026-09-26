// The UI kit export: src/templates/uiKit.html filled from a saved design by
// src/utils/uiKitExport.js, with its fonts gathered by src/utils/kitFonts.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import {
  renderUiKit, kitPalette, kitSelections, kitFontRequests, esc,
} from '../../src/utils/uiKitExport.js'
import { readIdentity, IDENTITY_NAME_MAX, IDENTITY_DESCRIPTION_MAX } from '../../src/utils/kitIdentity.js'
import { parseGoogleFontCss, loadKitFonts, licenseUrls, googleCssUrl } from '../../src/utils/kitFonts.js'
import { EXPORT_FORMATS, freeFormats, styleGuideFormats } from '../../src/config/exportFormats.js'
import { FREE_POINTS, PRO_POINTS } from '../../src/config/planFacts.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')
const TEMPLATE = read('src/templates/uiKit.html')
const MARK = read('public/favicon.svg')
const DATE = new Date('2026-01-02T00:00:00Z')
const OFL = { name: 'SIL Open Font License', text: 'Copyright 2020 The Test Project Authors\nSIL OPEN FONT LICENSE Version 1.1' }

// A working design as the app holds it: it has no top-level name. The identity a
// Pro kit is personalised with lives under `identity`, beside the logo.
const DESIGN = Object.freeze({
  palette: { base: '#2F6B5A', harmony: 'auto', colors: ['#2F6B5A', '#8C6BB1', '#E3B23C', '#EEF3EE', '#1B2A26'] },
  states: { success: 1, warning: 0, error: 0, info: 0 },
  fonts: { heading: { family: 'Space Grotesk', weight: 600, category: 'sans-serif' }, body: { family: 'Work Sans', weight: 400, category: 'sans-serif' } },
  typeScale: { base: 16, ratio: 1.333, lineHeight: 1.6 },
})
const FONTS = {
  'Space Grotesk': { faces: [{ base64: 'U1BBQ0U=', format: 'woff2', weight: '300 700', unicodeRange: 'U+0000-00FF' }], license: OFL },
  'Work Sans': { faces: [{ base64: 'V09SSw==', format: 'woff2', weight: '100 900', unicodeRange: 'U+0000-00FF' }], license: OFL },
}
const PUBLISHER = {
  publisherFonts: [{ family: 'Geist', axis: '300 700', faces: [{ subset: 'latin', base64: 'R0VJU1Q=' }] }],
  publisherLicense: 'Geist licence text',
}
const render = (design, opts = {}) => renderUiKit(design, {
  template: TEMPLATE, markSvg: MARK, fonts: FONTS, ...PUBLISHER, date: DATE, ...opts,
})
const dataOf = (html) => JSON.parse(/<script type="application\/json" id="brand-data">([\s\S]*?)<\/script>/.exec(html)[1])

test('the renderer is deterministic for a fixture project', () => {
  const a = render(DESIGN, { tier: 'free' })
  const b = render(DESIGN, { tier: 'free' })
  assert.equal(a.html, b.html)
  assert.equal(a.filename, 'uil4b-ui-kit.html')
  assert.ok(!/@@[A-Z_]+@@/.test(a.html), 'a placeholder was left unfilled')
  assert.ok(a.html.length > 30000, 'the kit is a real document')
})

const IDENTITY = Object.freeze({ name: 'Harbour', description: 'Moorings and chandlery on the north quay.' })
const NAMED = Object.freeze({ ...DESIGN, identity: IDENTITY })

test('a free kit carries the attribution, the watermark and the publisher links, and nothing personal', () => {
  const { html } = render(NAMED, { tier: 'free', logo: { src: 'data:image/png;base64,AAAA' } })
  assert.match(html, /<span class="section-watermark">Made with <a class="publisher-link" href="https:\/\/uil4b\.com\/"/)
  assert.ok((html.match(/class="section-watermark"/g) || []).length >= 7, 'every section ends with the mark')
  assert.match(html, /@bottom-left \{ content:"Made with UIL4B \/ Free UI kit"/, 'print margin credit')
  assert.match(html, /<div class="free-notice">/)
  assert.match(html, /<aside class="site-links">[\s\S]*href="https:\/\/uil4b\.com\/create\/palette"/)
  assert.match(html, /<span class="edition">Free edition<\/span>/)
  const data = dataOf(html)
  assert.equal(data.brand.tier, 'free')
  assert.match(data.json, /Made with UIL4B/, 'the JSON tokens carry the credit')
  assert.match(data.cssCredit, /Made with UIL4B · Free UI kit/, 'the CSS download carries the credit')
  // Nothing personal: no identity section, no name, no logo, not even in the data.
  assert.ok(!html.includes('class="chapter personal-identity"'))
  assert.ok(!html.includes('Harbour'), 'the project name reached a free kit')
  assert.ok(!html.includes(IDENTITY.description), 'the description reached a free kit')
  assert.ok(!html.includes('data:image/png;base64,AAAA'), 'the logo reached a free kit')
})

test('a pro kit has none of the attribution, and shows the identity it was given', () => {
  const logo = { src: 'data:image/png;base64,iVBORw0KGgo=' }
  const { html, filename } = render(NAMED, { tier: 'pro', logo })
  // Markup, not class names: the stylesheet still defines every class.
  for (const marker of ['class="section-watermark"', 'class="free-notice"', 'class="site-links"', 'class="publisher-link"', 'Made with UIL4B', 'uil4b.com']) {
    assert.ok(!html.includes(marker), `a Pro kit still carries ${marker}`)
  }
  assert.match(html, /@page \{ @bottom-right/, 'Pro keeps page numbers only')
  assert.match(html, /<section class="chapter personal-identity" id="identity">[\s\S]*<div class="identity-name">Harbour<\/div>/)
  assert.match(html, /<h2>Your identity\.<\/h2><p>Moorings and chandlery on the north quay\.<\/p>/,
    'the description the person wrote replaces the template default')
  assert.ok(html.includes(`<img src="${logo.src}" alt="Harbour logo">`))
  assert.match(html, /<span class="pro-title">Harbour<\/span>/)
  assert.equal(filename, 'harbour-ui-kit.html')
  assert.ok(!/Made with UIL4B/.test(dataOf(html).json))
  assert.equal(dataOf(html).cssCredit, '')

  // A name with no description keeps the template's own line.
  const plain = render({ ...DESIGN, identity: { name: 'Harbour' } }, { tier: 'pro' })
  assert.match(plain.html, /<h2>Your identity\.<\/h2><p>Your supplied identity, paired with the selected interface system\.<\/p>/)

  // No name, no identity section — a logo or a description alone does not make one.
  const unnamed = render({ ...DESIGN, identity: { description: IDENTITY.description } }, { tier: 'pro', logo })
  assert.ok(!unnamed.html.includes('class="chapter personal-identity"'))
  assert.ok(!unnamed.html.includes(IDENTITY.description))
  assert.equal(unnamed.filename, 'ui-kit.html')
})

test('the identity is read from the working design, never from a field it does not have', () => {
  // The working design has no top-level `name`. A kit built from one that
  // carries a stray name must not pick it up; only `identity` personalises.
  const stray = render({ ...DESIGN, name: 'Stray' }, { tier: 'pro' })
  assert.ok(!stray.html.includes('Stray'))
  assert.ok(!stray.html.includes('class="chapter personal-identity"'))
  // Untrusted fields: whitespace is collapsed, lengths are capped, non-strings are dropped.
  const messy = kitSelections({ ...DESIGN, identity: { name: `  Harbour \n Co  ${'x'.repeat(200)}`, description: 42 } }, { tier: 'pro' })
  assert.equal(messy.personalisation.name.slice(0, 10), 'Harbour Co')
  assert.equal(messy.personalisation.name.length, IDENTITY_NAME_MAX)
  assert.equal(messy.personalisation.description, undefined)
  const long = readIdentity({ identity: { name: 'A', description: 'y'.repeat(400) } })
  assert.equal(long.description.length, IDENTITY_DESCRIPTION_MAX)
  assert.deepEqual(readIdentity(null), { name: '', description: '' })
})

test('the kit JSON is DTCG, with the generator metadata in $extensions on free kits only', () => {
  const free = JSON.parse(dataOf(render(NAMED, { tier: 'free' }).html).json)
  assert.deepEqual(free.$extensions, { 'com.uil4b': { generator: 'UIL4B', edition: 'free', url: 'https://uil4b.com/' } })
  assert.equal(free.$metadata, undefined, '$metadata is not a DTCG slot')
  assert.equal(free.color.primary.$root.$type, 'color', 'the tokens are unchanged beside it')

  const pro = JSON.parse(dataOf(render(NAMED, { tier: 'pro' }).html).json)
  assert.equal(pro.$extensions, undefined, 'a Pro kit JSON carries no metadata')
  assert.equal(pro.$metadata, undefined)
  const proText = JSON.stringify(pro)
  for (const marker of ['generator', 'edition', 'uil4b.com', 'UIL4B']) {
    assert.ok(!proText.includes(marker), `a Pro kit JSON still carries ${marker}`)
  }
})

test('the tier is only ever free or pro', () => {
  assert.throws(() => render(DESIGN, { tier: 'enterprise' }), /tier/)
})

test('the example selections never reach a real project', () => {
  const { html } = render(DESIGN, { tier: 'free' })
  const example = [
    'Citron', 'Pine', 'Lilac', 'Chalk', '#DDF451', '#203C35', '#DBD0EB', '#F7F8F2', '#18221E',
    '#286546', '#805A13', '#A3333A', '#345C8C', 'Bricolage Grotesque', 'Hanken Grotesk', 'Example selections',
  ]
  for (const value of example) assert.ok(!html.includes(value), `example value ${value} leaked into the kit`)
  assert.ok(html.includes('Your selections · Fixed UI kit export'))
  assert.ok(html.includes('Space Grotesk') && html.includes('Work Sans'), 'the project fonts are named')
  for (const hex of DESIGN.palette.colors) assert.ok(html.includes(hex), `${hex} from the palette is missing`)
})

test('the five slots follow the palette positions, with shares that total 100', () => {
  const slots = Object.fromEntries(kitPalette(DESIGN).map((p) => [p.id, p]))
  assert.equal(slots.pine.hex, '#2F6B5A')
  assert.equal(slots.lilac.hex, '#8C6BB1')
  assert.equal(slots.citron.hex, '#E3B23C')
  assert.equal(slots.chalk.hex, '#EEF3EE')
  assert.equal(slots.ink.hex, '#1B2A26')
  assert.equal(Object.values(slots).reduce((n, p) => n + p.share, 0), 100)
  for (const p of Object.values(slots)) {
    assert.equal(p.scale['500'], p.hex, `${p.id}: the 500 stop is the colour itself`)
    assert.equal(Object.keys(p.scale).length, 11)
  }
  // A one-colour project fills the other slots from its own scale and says so.
  const one = Object.fromEntries(kitPalette({ palette: { colors: ['#0051FF'] } }).map((p) => [p.id, p]))
  assert.equal(one.pine.hex, '#0051FF')
  for (const id of ['citron', 'lilac', 'chalk', 'ink']) assert.match(one[id].source, /Primary|contrast/, `${id} does not say where it came from`)
})

test('every variable the document names is in the CSS and JSON it hands over', () => {
  const { html } = render(DESIGN, { tier: 'free' })
  const data = dataOf(html)
  const shown = [...html.matchAll(/data-copy="var\((--[a-z-]+)\)"/g)].map((m) => m[1])
  assert.equal(shown.length, 8)
  for (const name of shown) assert.match(data.css, new RegExp(`\\s${name}:`), `${name} is shown but not exported`)
  assert.match(html, /<code>--color-primary-50<\/code> through <code>--color-primary-950<\/code>/)
  assert.match(data.css, /--color-primary-950:/)
  // The JSON is the app's DTCG token file, not a second format.
  const json = JSON.parse(data.json)
  assert.equal(json.color.primary.$root.$type, 'color')
  assert.equal(json.color.background.$value.hex, kitPalette(DESIGN).find((p) => p.id === 'chalk').hex)
  assert.deepEqual(json.space['4'].$value, { value: 4, unit: 'px' })
})

test('with the fonts embedded, the kit makes no network request', () => {
  const { html, embedded, missing } = render(DESIGN, { tier: 'free' })
  assert.deepEqual(missing, [])
  assert.deepEqual(embedded.sort(), ['Space Grotesk', 'Work Sans'])
  assert.ok(!/url\(\s*['"]?https?:/i.test(html), 'a url() still points at the network')
  assert.ok(!/@import/i.test(html), 'an @import is left')
  assert.ok(!/<link[^>]+href="https?:/i.test(html), 'a <link> still loads from the network')
  assert.ok(!/<(?:img|script|iframe)[^>]+src="https?:/i.test(html), 'an element still loads from the network')
  assert.match(html, /@font-face\{font-family:"Space Grotesk";src:url\(data:font\/woff2;base64,U1BBQ0U=\)/)
  assert.ok(html.includes('Both selected fonts are embedded in this HTML.'))
  assert.ok(html.includes('Space Grotesk and Work Sans are distributed under the SIL Open Font License. Both are included in this file.'))
  assert.ok(dataOf(html).licenses.includes('SIL OPEN FONT LICENSE'))
})

test('a font that could not be fetched falls back, and the kit says so', () => {
  const { html, missing } = render(DESIGN, { tier: 'free', fonts: { 'Space Grotesk': FONTS['Space Grotesk'] } })
  assert.deepEqual(missing, ['Work Sans'])
  assert.ok(html.includes('Work Sans could not be embedded, so it is shown in the reader’s sans-serif font.'))
  assert.ok(html.includes('Work Sans is not included in this file.'))
  assert.ok(!/font-family:"Work Sans";src/.test(html))
  // A face without its licence is never embedded.
  const noLicence = render(DESIGN, { tier: 'free', fonts: { 'Work Sans': { faces: FONTS['Work Sans'].faces } } })
  assert.ok(noLicence.missing.includes('Work Sans'))
})

test('user-supplied text renders inert', () => {
  const evil = '<script>alert(1)</script>'
  const design = {
    ...DESIGN,
    fonts: { heading: { family: 'Evil"</style><script>alert(2)</script>', weight: 600 }, body: DESIGN.fonts.body },
  }
  design.identity = { name: `Studio ${evil} & "co" $&`, description: `About ${evil}` }
  const { html } = render(design, { tier: 'pro' })
  assert.equal((html.match(/<script/g) || []).length, 2, 'only the template\'s own two scripts may exist')
  assert.ok(!html.includes('alert(1)</script>') && !html.includes('alert(2)</script>'))
  assert.ok(html.includes(`Studio ${esc(evil)} &amp; &quot;co&quot; $&amp;`), 'the name is shown, escaped and literal')
  assert.ok(html.includes(`About ${esc(evil)}`), 'the description is shown, escaped')
  assert.ok(!html.includes('</style><script>'), 'a font name broke out of the stylesheet')
})

test('the export panel offers the kit as a free format, and the plan lines say so', () => {
  const kit = EXPORT_FORMATS.find((f) => f.id === 'kit')
  assert.ok(kit && kit.live && !kit.pro, 'the UI kit must be built and free')
  assert.equal(EXPORT_FORMATS[0].id, 'kit', 'the kit is the first format the panel offers')
  assert.ok(freeFormats().includes(kit))
  assert.ok(!styleGuideFormats().includes(kit))
  assert.ok(FREE_POINTS.some((l) => l.startsWith('The UI kit')))
  assert.ok(PRO_POINTS.some((l) => /UI kit with no “Made with UIL4B” line/.test(l)))
  const panel = read('src/components/ExportPanel.jsx')
  assert.match(panel, /useState\('kit'\)/, 'the kit is the panel\'s default format')
  assert.match(panel, /tier: isPro \? 'pro' : 'free'/, 'the kit tier comes from the live entitlement')
  // The kit's identity comes from the working design inside the renderer. The
  // design has no `name`, so passing one from here personalised nothing.
  const call = panel.slice(panel.indexOf('buildUiKit(design'), panel.indexOf('download(blob, filename)'))
  assert.ok(call.length > 0, 'the kit call is no longer found — this assertion has gone blind')
  assert.doesNotMatch(call, /design\?\.name|projectName/, 'the kit is handed a name the working design does not hold')
})

test('the font requests name each selected family once, with the weights the kit sets', () => {
  const same = kitFontRequests({ ...DESIGN, fonts: { heading: { family: 'Inter', weight: 700 }, body: { family: 'Inter', weight: 400 } } })
  assert.equal(same.length, 1)
  assert.deepEqual(same[0].weights, [400, 500, 600, 700])
  assert.equal(kitSelections(DESIGN, { tier: 'free' }).fonts.display.name, 'Space Grotesk')
})

/* ── kitFonts ─────────────────────────────────────────────────────────────── */

const CSS2 = `/* cyrillic */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400 700; src: url(https://fonts.gstatic.com/s/inter/cyr.woff2) format('woff2'); unicode-range: U+0400-045F; }
/* latin-ext */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/ext.woff2) format('woff2'); unicode-range: U+0100-02BA; }
/* latin */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 400; src: url(https://fonts.gstatic.com/s/inter/lat.woff2) format('woff2'); unicode-range: U+0000-00FF; }
/* latin */
@font-face { font-family: 'Inter'; font-style: normal; font-weight: 700; src: url(https://fonts.gstatic.com/s/inter/lat.woff2) format('woff2'); unicode-range: U+0000-00FF; }`

const fakeFetch = (routes) => async (url) => {
  const hit = routes[url]
  if (hit === undefined) return { ok: false }
  return { ok: true, text: async () => hit, arrayBuffer: async () => new TextEncoder().encode(hit).buffer }
}

test('only the latin and latin-ext faces of a Google stylesheet are kept', () => {
  const faces = parseGoogleFontCss(CSS2)
  assert.deepEqual(faces.map((f) => f.subset), ['latin-ext', 'latin', 'latin'])
  assert.ok(faces.every((f) => f.url.startsWith('https://fonts.gstatic.com/')))
})

test('a Google family is embedded once per file, with its licence', async () => {
  const routes = {
    [googleCssUrl('Inter', [400, 700])]: CSS2,
    [licenseUrls('Inter')[0].url]: 'Inter OFL text',
    'https://fonts.gstatic.com/s/inter/ext.woff2': 'ext-bytes',
    'https://fonts.gstatic.com/s/inter/lat.woff2': 'lat-bytes',
  }
  const out = await loadKitFonts([{ family: 'Inter', weights: [400, 700] }], { fetch: fakeFetch(routes) })
  assert.equal(out.Inter.license.name, 'SIL Open Font License')
  assert.equal(out.Inter.faces.length, 2, 'the variable latin file was embedded twice')
  assert.equal(out.Inter.faces.find((f) => f.unicodeRange === 'U+0000-00FF').weight, '400 700')
})

test('no licence, no file: the family is left to its fallback', async () => {
  const routes = {
    [googleCssUrl('Inter', [400])]: CSS2,
    'https://fonts.gstatic.com/s/inter/ext.woff2': 'x',
    'https://fonts.gstatic.com/s/inter/lat.woff2': 'x',
  }
  const out = await loadKitFonts([{ family: 'Inter', weights: [400] }], { fetch: fakeFetch(routes) })
  assert.deepEqual(out, {})
  // And a network that throws never rejects the export.
  const offline = await loadKitFonts([{ family: 'Inter', weights: [400] }], { fetch: async () => { throw new Error('offline') } })
  assert.deepEqual(offline, {})
})

test('a self-hosted family is read from our own origin', async () => {
  const routes = { '/fonts/HANKEN-GROTESK-OFL.txt': 'Hanken OFL', '/fonts/hanken-grotesk-latin.woff2': 'bytes' }
  const out = await loadKitFonts([{ family: 'Hanken Grotesk', weights: [400] }], { fetch: fakeFetch(routes) })
  assert.equal(out['Hanken Grotesk'].faces.length, 1)
  assert.equal(out['Hanken Grotesk'].faces[0].weight, '100 900')
})
