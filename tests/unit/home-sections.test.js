// The homepage sections rebuilt in the 2026-08 copy pass (C8–C13), tested at
// the cheapest layer that can prove them.
//
// Three of these guarantees are DATA guarantees, not rendered ones, which is
// why they live here rather than in the browser suite:
//
//   · C9 — the step rail's routes must be DERIVED from the canonical route
//     table, because every Create tool is migrating to /create/<pagetitle>.
//     A hard-coded '/color/palette' would ship a dead URL the day that lands,
//     and a browser test against today's routes would go green anyway.
//   · C11 — every gallery card must link inward, and no Pro brand system may
//     have its colours handed over through ?c=.
//   · C12 — the code the export section shows must be the shipped exporter's
//     own output.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { CREATE_GROUPS, LEARN_GROUPS, createRoutes } from '../../src/data/toolTree.js'
import { HOME_GALLERY, HOME_BRANDS, HOME_CURATED, HOME_GRADIENTS } from '../../src/data/homeGallery.js'
import { BRAND_LIBRARY_PALETTES } from '../../src/data/paletteLibrary.js'
import { paletteCss } from '../../src/data/paletteGallery.js'
import { buildCSSVars, buildTailwindTheme } from '../../src/utils/exportBuilder.js'

const read = (p) => fs.readFileSync(path.join(process.cwd(), p), 'utf8')

// The comments in these files necessarily quote the very strings under test —
// this file's own subject matter is "which literals must NOT appear" — so a raw
// match would pass on prose and miss the real thing coming back. Strip first.
const stripJs = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '')

const home = stripJs(read('src/pages/Home.jsx'))
const gallery = stripJs(read('src/components/HomeGallery.jsx'))

/* ── C9 · the step rail reads the canonical route table ────────────────────── */

test('C9 · every sticky step names a tool id the router actually serves', () => {
  const ids = [...home.matchAll(/^\s*tool: '([a-z0-9-]+)',$/gm)].map((m) => m[1])
  assert.equal(ids.length, 5, 'five steps, one per workbench mode')

  const byId = Object.fromEntries(CREATE_GROUPS.flatMap((g) => g.tools).map((t) => [t.id, t.route]))
  const routes = createRoutes()
  for (const id of ids) {
    assert.ok(byId[id], `step tool "${id}" is not in CREATE_GROUPS`)
    assert.ok(routes.includes(byId[id]), `${byId[id]} is not a route the router serves`)
  }
})

test('C9 · no step route is typed into the homepage', () => {
  // If any of these appears as a literal, the rail has stopped following the
  // route table and the /create/<pagetitle> migration will silently break it.
  for (const route of ['/color/palette', '/color/gradient', '/file-converter', '/icons', '/typescale']) {
    assert.ok(
      !home.includes(`'${route}'`),
      `Home.jsx hard-codes ${route}. Derive it from CREATE_GROUPS instead — the Create routes are migrating.`,
    )
  }
})

/* ── C11 · the gallery links inward, and respects the Pro gate ─────────────── */

test('C11 · every gallery card links to an in-product route, never off-site', () => {
  const items = HOME_GALLERY.all
  assert.ok(items.length > 100, 'the gallery draws on the full shipped set')
  for (const item of items) {
    assert.ok(item.to.startsWith('/'), `${item.name} links to ${item.to}, which leaves the site`)
    assert.ok(!/^\/\//.test(item.to), `${item.name} links protocol-relative off-site`)
    const base = item.to.split('?')[0]
    assert.ok(
      createRoutes().includes(base),
      `${item.name} points at ${base}, which is not a Create route`,
    )
  }
})

test('C11 · the homepage renders no outbound anchor attributes', () => {
  assert.ok(!/target=/.test(gallery), 'a homepage gallery card must not open a new tab')
  assert.ok(!/nofollow/.test(gallery), 'nofollow means we are linking somewhere we do not own')
  assert.ok(!/https?:/.test(gallery), 'no external host belongs in this section')
})

test('C11 · a Pro brand system is never handed over through the colour query', () => {
  // The filter is only meaningful while some brands are actually gated, so
  // assert that first — otherwise this test could pass by being toothless.
  assert.ok(BRAND_LIBRARY_PALETTES.some((b) => b.pro), 'some brand palettes are Pro-gated')
  assert.ok(HOME_BRANDS.length > 0, 'the free brands still reach the homepage')
  for (const item of HOME_BRANDS) {
    const source = BRAND_LIBRARY_PALETTES.find((b) => `brand-${b.id}` === item.key.replace('brand-', 'brand-'))
    assert.ok(!source?.pro, `${item.name} is Pro-gated and must not be linked with its colours`)
  }
  const proNames = new Set(BRAND_LIBRARY_PALETTES.filter((b) => b.pro).map((b) => b.name))
  for (const item of HOME_GALLERY.all) {
    if (item.kind !== 'brand') continue
    assert.ok(!proNames.has(item.name), `${item.name} is a Pro brand system and must not be in the grid`)
  }
})

test('C11 · a card copies exactly what its own tool copies', () => {
  // Two implementations of "the CSS for this palette" would drift, and a
  // visitor copying the same palette from two surfaces would get two files.
  const first = HOME_CURATED[0]
  assert.equal(first.css, paletteCss({ name: first.name, colors: first.colors }))
  const grad = HOME_GRADIENTS[0]
  assert.match(grad.css, /^background: (linear|radial|conic)-gradient\(/)
})

test('C11 · no card claims a metric the product cannot yet measure', () => {
  for (const item of HOME_GALLERY.all) {
    for (const fact of item.facts) {
      assert.ok(!/save|like|remix|view/i.test(fact), `"${fact}" claims a signal we do not have`)
    }
  }
})

/* ── C12 · the export panel shows real exporter output ─────────────────────── */

test('C12 · the exporter writes the formats the section claims', () => {
  const palette = { colors: ['#2E3440', '#3B4252', '#88C0D0', '#ECEFF4'] }
  const fonts = { heading: { family: 'Inter' }, body: { family: 'Inter' } }

  const css = buildCSSVars({ palette, fonts, typeScale: { base: 16, ratio: 1.25, lineHeight: 1.5 } })
  assert.match(css, /^:root \{/)
  assert.match(css, /--color-primary: #2E3440;/)
  assert.match(css, /--font-size-base: 16px;/)

  const tailwind = buildTailwindTheme({ palette, fonts })
  assert.match(tailwind, /import\('tailwindcss'\)\.Config/)
  assert.match(tailwind, /'primary': '#2E3440',/)
  assert.match(tailwind, /heading: \['Inter', 'system-ui', 'sans-serif'\],/)
})

test('C12 · the homepage does not hand-write a code sample', () => {
  const exportSrc = stripJs(read('src/components/HomeExport.jsx'))
  assert.ok(!exportSrc.includes(':root {'), 'the CSS shown must come from buildCSSVars, not a string')
  assert.ok(!exportSrc.includes('module.exports'), 'the Tailwind config shown must come from buildTailwindTheme')
  for (const fn of ['buildCSSVars', 'buildTailwindTheme', 'buildStyleGuideHTML']) {
    assert.ok(exportSrc.includes(fn), `${fn} must feed the panel`)
  }
})

test('C12 · the section does not describe exports as a Pro-only capability', () => {
  const exportSrc = stripJs(read('src/components/HomeExport.jsx'))
  // Founder decision, 2026-08-20: free gets EVERY format; Pro removes the
  // credit. The older "Pro unlocks exports" line was corrected out of
  // positioning.md, and it must not reappear as marketing copy here.
  assert.ok(/Every format is free to export/.test(exportSrc), 'the free entitlement must be stated')
  assert.ok(!/Pro unlocks|unlocks exports|exports are Pro|Pro-only/i.test(exportSrc))
})

/* ── C13 · Learn links only where something exists ─────────────────────────── */

test('C13 · exactly one Learn row navigates, and it is the live route', () => {
  const ids = [...home.matchAll(/^const LEARN_ROWS = \[([^\]]+)\]/gm)]
  assert.equal(ids.length, 1, 'LEARN_ROWS is built in one place')

  // Every Learn group is still soon:true pointing at /learn, which is exactly
  // why only one row may be a link. If that ever stops being true this test
  // should be revisited rather than deleted.
  assert.ok(LEARN_GROUPS.every((g) => g.soon), 'every LEARN_GROUPS entry is still coming soon')
  assert.ok(LEARN_GROUPS.every((g) => g.route === '/learn'), 'every LEARN_GROUPS entry still routes to /learn')

  // The one destination the homepage may name, and the read times it may not.
  assert.ok(/\{ \.\.\.group, to: '\/help' \}/.test(home), 'the Help row is the single live destination')
  assert.ok(!/min read|minute read|\d+ min/i.test(home), 'a read time for an unwritten guide is fabrication')
})
