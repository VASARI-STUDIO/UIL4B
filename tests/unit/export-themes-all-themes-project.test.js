// A project brand (projectToBrand) renders through every export theme, in both editions.
//
// What is pinned here, and the change that makes each fail:
//  1. EVERY GUIDELINES AND UI-KIT PAGE OF EVERY THEME RENDERS FROM A PROJECT BRAND, SLOT AND SHOWCASE, WITH NO THROW AND NO
//     "undefined", "NaN", "[object Object]" OR LEFTOVER PLACEHOLDER MARK IN THE DOCUMENT.
//     Break: in themes/10-inuse/index.js read ctx.byId.hover.hex again, or in themes/04-standards/guidelines.js read L.geo.x with no fallback.
//  1b. EVERY THEME'S BRAND BOOK RENDERS FROM A PROJECT BRAND, AS THE PRINT PAGE AND AS THE SITE ZIP, WITH THE SAME ASSERTIONS, AND THE SITE LINKS NO FILE
//     THE ZIP LACKS.
//     Break: in themes/03-broadsheet/book.js read S.nameplate with no typeToken stand-in, in themes/06-studio/book.js look up nm('steel') by id only,
//     in themes/10-inuse/book.js read col('deep-end').hex with no role fallback, or call bookFiles in exportThemeRoute.js without outside: false.
//  2. NO SAMPLE-BRAND TEXT LEAKS INTO THE SLOT EDITION'S BRAND, IN ANY THEME: a string the project did not write that is also in a
//     sample brand's text means a skeleton string in projectToBrand copied a sample wording.
//     Break: set a string in the skeleton of brandFromProject.js to one of margin's.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { projectToBrand } from '../../api/_lib/exportThemes/brandFromProject.js'
import { makeCtx, GUIDE_PAGES, UIKIT_PAGES } from '../../api/_lib/exportThemes/engine/pages.js'
import { pageDoc } from '../../api/_lib/exportThemes/engine/doc.js'
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js'
import loaders from '../../api/_lib/exportThemes/node-loaders.js'
import { renderThemeExport } from '../../api/_lib/exportThemeRoute.js'
import JSZip from 'jszip'

const THEMES_DIR = new URL('../../api/_lib/exportThemes/themes/', import.meta.url)
const DIRS = fs.readdirSync(THEMES_DIR).filter((d) => /^\d\d-/.test(d)).sort()
const DATE = '2026-11-06'

const palette = (colors) => ({ colors, base: colors[0], harmony: 'auto' })
const face = (family, weight, category) => ({ family, weight, category })
const BUNDLED = { heading: face('Barlow Condensed', 700, 'sans-serif'), body: face('Roboto', 400, 'sans-serif') }
const TEAL = ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27']
// Three generic projects: a five-colour palette on bundled fonts, a serif pair from the catalogue (a body weight the files lack), and one bright colour.
const PROJECTS = {
  'teal, bundled fonts': { design: { palette: palette(TEAL), fonts: BUNDLED }, name: 'Tide & Co.' },
  'teal, serif pair': { design: { palette: palette(TEAL), fonts: { heading: face('Playfair Display', 700, 'serif'), body: face('Lora', 400, 'serif') } }, name: 'Harbour Press' },
  'one colour': { design: { palette: palette(['#E63946']), fonts: BUNDLED }, name: 'Red Door' },
}
const brands = Object.fromEntries(Object.entries(PROJECTS).map(([k, v]) => [k, projectToBrand({ design: v.design, projectName: v.name, date: DATE })]))

const PRIVATE_USE = String.fromCodePoint(0xE000) + '-' + String.fromCodePoint(0xF8FF)
const BAD = new RegExp(String.raw`\[object Object\]|\bundefined\b|\bNaN\b|[${PRIVATE_USE}]`)

const mods = {}
for (const dir of DIRS) mods[dir] = await import(new URL(`${dir}/index.js`, THEMES_DIR).href)

// ---- 1. every page renders ----
for (const dir of DIRS) {
  test(`theme ${dir}: every guidelines and UI-kit page renders from a project brand, both editions`, () => {
    const T = mods[dir]
    const failures = []
    for (const [label, brand] of Object.entries(brands)) {
      for (const edition of ['slot', 'showcase']) {
        for (const [kind, list] of [['guidelines', GUIDE_PAGES], ['uikit', UIKIT_PAGES]]) {
          let ctx
          try { ctx = makeCtx(T, edition, kind, loaders, brand) } catch (e) { failures.push(`${label} ${edition} ${kind}: ctx ${e.message}`); continue }
          for (const p of list) {
            try {
              const doc = pageDoc(ctx, T, { title: p.id, pages: [T[kind][p.id](ctx)], size: ctx.size })
              const m = BAD.exec(doc)
              if (m) failures.push(`${label} ${edition} ${kind}/${p.id}: printed ${JSON.stringify(m[0])} near ${JSON.stringify(doc.slice(Math.max(0, m.index - 40), m.index + 40))}`)
            } catch (e) { failures.push(`${label} ${edition} ${kind}/${p.id}: ${e.message}`) }
          }
        }
      }
    }
    assert.deepEqual(failures, [])
  })
}

// ---- 1b. every theme's brand book renders from a project brand, as the print page and as the site zip the route returns ----
// The site's index.html links the kit by relative path; each link must name a file the zip holds (the route's kit zip has no PNG or PDF files).
for (const dir of DIRS) {
  test(`theme ${dir}: the brand book renders from a project brand as print HTML and as a site, with no dead download link`, async () => {
    const failures = []
    const check = (label, doc) => {
      const m = BAD.exec(doc)
      if (m) failures.push(`${label}: printed ${JSON.stringify(m[0])} near ${JSON.stringify(doc.slice(Math.max(0, m.index - 40), m.index + 40))}`)
    }
    for (const [label, p] of Object.entries(PROJECTS)) {
      const input = { theme: dir, row: 'book', design: p.design, projectName: p.name }
      try {
        const print = await renderThemeExport({ ...input, format: 'pdf' })
        assert.equal(typeof print.html, 'string')
        check(`${label} print`, print.html)
      } catch (e) { failures.push(`${label} print: ${e.message}`) }
      try {
        const site = await renderThemeExport({ ...input, format: 'html' })
        const zip = await JSZip.loadAsync(site.zip)
        const names = Object.keys(zip.files).filter((n) => !zip.files[n].dir)
        const top = names[0].split('/')[0]
        const index = await zip.file(`${top}/index.html`).async('string')
        check(`${label} site`, index)
        const dead = new Set()
        for (const [, ref] of index.matchAll(/(?:href|src)="(assets\/[^"#]*)"/g)) if (!zip.file(`${top}/${decodeURIComponent(ref)}`)) dead.add(ref)
        if (dead.size) failures.push(`${label} site: ${dead.size} link(s) to files the zip lacks, such as ${[...dead].slice(0, 2).join(', ')}`)
      } catch (e) { failures.push(`${label} site: ${e.message}`) }
    }
    assert.deepEqual(failures, [])
  })
}

// ---- 2. nothing of a sample brand leaks into the slot edition's brand ----
const strings = (v, path = '', out = []) => {
  if (typeof v === 'string') out.push([path, v])
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, path ? `${path}.${k}` : k, out)
  return out
}
const SENTINEL = new RegExp(`[${PRIVATE_USE}]`)
// Values the themes read by name, not words the project writes (token, face, tone, role and id names, font files, the version, hex colours,
// the shadow keyword, the icon name beside a link label), and the colour roles and ids a theme looks colours up by.
const STRUCTURAL = /(^|\.)(token|face|tone|role|id|status|theme|fg|bg)$|^fonts\.|^version\.|^ui\.shadows$|links\[\d+\]\[1\]$|^logo\.colourways\./
const HEX_COLOUR = /^#[0-9A-Fa-f]{6}$/
// A string under 24 characters is shared UI vocabulary (Back, Skip, Total, a clock time, "Say what to do next."), not a brand's wording.
const MIN_LEAK = 24
const sample = new Set()
for (const b of Object.values(BRANDS)) for (const [, s] of strings(b.data)) sample.add(s)

test('the sample brands hold enough text for the leak check to mean something', () => {
  assert.ok(sample.size > 1500, `only ${sample.size} sample strings`)
})

for (const dir of DIRS) {
  test(`theme ${dir}: the slot edition's brand holds no sample-brand wording`, () => {
    const T = mods[dir]
    const leaks = []
    for (const [label, brand] of Object.entries(brands)) {
      for (const kind of ['guidelines', 'uikit']) {
        const ctx = makeCtx(T, 'slot', kind, loaders, brand)
        for (const [p, s] of strings(ctx.brand)) if (!SENTINEL.test(s) && !STRUCTURAL.test(p) && !HEX_COLOUR.test(s) && s.length >= MIN_LEAK && sample.has(s)) leaks.push(`${label} ${kind} ${p}: ${s.slice(0, 40)}`)
      }
    }
    assert.deepEqual([...new Set(leaks)], [])
  })
}

test('CONTROL: the leak check sees a sample brand\'s copy when it is there', () => {
  const brand = structuredClone(brands['teal, bundled fonts'])
  brand.type.scale[3].use = BRANDS.margin.data.type.scale[3].use
  const ctx = makeCtx(mods['01-presentation'], 'slot', 'guidelines', loaders, brand)
  const hit = strings(ctx.brand).some(([p, s]) => p === 'type.scale[3].use' && sample.has(s))
  assert.ok(hit, 'a planted sample string was not found')
})
