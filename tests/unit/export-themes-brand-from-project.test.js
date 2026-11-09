// projectToBrand turns a saved project's design into slot-edition brand data for the export themes.
//
// What is pinned here, and the change that makes each fail:
//  1. REAL DESIGNS MAKE A VALID BRAND: colours, fonts, wordmark and slug come from the project. Break: return the sample brand's slug.
//  2. ODD PALETTES KEEP THEIR CONTRAST IN BOTH MODES: greys, white and black are the ones that cannot be tinted.
//     Break: take the achromatic guard out of darkRoles (the dark grounds go warm), or the actionEdge line out of lightRoles.
//  3. EVERY FONT FALLS BACK TO A FILE WE HOLD: bundled, catalogue and unknown families, and a missing fonts object.
//     Break: look the family up in TTF_FAMILIES without the own-property check (a family called "toString" throws).
//  4. NO ODD DESIGN ESCAPES AS A PLAIN ERROR, AND EACH THAT SUCCEEDS RENDERS THROUGH THEMES 04 AND 02.
//     Break: let a thrown TypeError out of projectToBrand, or set a status id the themes ask for to an unknown one.
//  5. NO SAMPLE-BRAND TEXT LEAKS: after the slot edition swaps in placeholders, nothing the project did not write is margin's copy.
//     Break: set type.scale[3].use back to a margin string.
import test from 'node:test'
import assert from 'node:assert/strict'
import { projectToBrand } from '../../api/_lib/exportThemes/brandFromProject.js'
import { BrandInputError, validateBrand } from '../../api/_lib/exportThemes/engine/validate.js'
import { makeCtx, GUIDE_PAGES, UIKIT_PAGES } from '../../api/_lib/exportThemes/engine/pages.js'
import { pageDoc } from '../../api/_lib/exportThemes/engine/doc.js'
import { ratio } from '../../api/_lib/exportThemes/engine/color.js'
import { BRANDS } from '../../api/_lib/exportThemes/brands/index.js'
import { TTF_FAMILIES } from '../../api/_lib/exportThemes/fontCatalogue.js'
import loaders from '../../api/_lib/exportThemes/node-loaders.js'
import * as theme04 from '../../api/_lib/exportThemes/themes/04-standards/index.js'
import * as theme02 from '../../api/_lib/exportThemes/themes/02-poster/index.js'

const THEMES = { '04-standards': theme04, '02-poster': theme02 }
const PAGES = { guidelines: GUIDE_PAGES, uikit: UIKIT_PAGES }
const DATE = '2026-11-06'

const palette = (colors, base) => ({ colors, base: base || colors[0], harmony: 'auto' })
const face = (family, weight, category) => ({ family, weight, category })
const BUNDLED_FONTS = { heading: face('Barlow Condensed', 700, 'sans-serif'), body: face('Roboto', 400, 'sans-serif') }
const TEAL = ['#2F6F5E', '#F2C14E', '#8FB8A8', '#F4F1EA', '#1D2B27']
const hue = (i, n) => {
  const h = (i / n) * 6
  const f = (k) => Math.round(255 * (1 - 0.6 * Math.max(0, Math.min(1, Math.min((k + h) % 6, 4 - ((k + h) % 6))))))
  return `#${[5, 3, 1].map((k) => f(k).toString(16).padStart(2, '0')).join('').toUpperCase()}`
}

const make = (design, projectName = 'Tide & Co.') => projectToBrand({ design, projectName, date: DATE })
const teal = (extra = {}) => ({ palette: palette(TEAL), fonts: BUNDLED_FONTS, ...extra })

// ---- 1. real designs ----
const REAL = {
  'teal with bundled fonts': { design: teal(), name: 'Tide & Co.' },
  'serif pair from the catalogue': { design: { palette: palette(TEAL), fonts: { heading: face('Playfair Display', 700, 'serif'), body: face('Lora', 400, 'serif') } }, name: 'Harbour Press' },
  'a single bright colour': { design: { palette: palette(['#E63946']), fonts: BUNDLED_FONTS }, name: 'Red Door' },
  'twenty colours': { design: { palette: palette(Array.from({ length: 20 }, (_, i) => hue(i, 20))), fonts: BUNDLED_FONTS }, name: 'Twenty' },
}

for (const [label, { design, name }] of Object.entries(REAL)) {
  test(`a real design makes a brand the validator and the loader accept: ${label}`, () => {
    const brand = make(design, name)
    assert.equal(brand.edition, 'slot')
    assert.equal(brand.version.date, DATE)
    assert.deepEqual(validateBrand(brand), brand, 'validateBrand should not need to change anything projectToBrand wrote')
    assert.match(brand.slug, /^p-[a-z0-9-]*$/)
    assert.ok(brand.slug.length <= 41, `slug ${brand.slug} is ${brand.slug.length} characters`)
    assert.ok(!(brand.slug in BRANDS), 'the slug must never be a sample brand')
    assert.equal(brand.name, brand.logo.showcase.wordmark)
    const share = brand.colours.reduce((a, c) => a + c.share, 0)
    assert.ok(Math.abs(share - 1) < 0.002, `colour shares add up to ${share}`)
    assert.ok(brand.colours.length <= 12, 'at most twelve colours')
    assert.deepEqual(brand.type.scale.map((t) => t.token), ['display', 'headline', 'title', 'body', 'label', 'caption'])
    for (const t of brand.type.scale) {
      assert.ok(t.size >= 6 && t.size <= 400 && t.line >= 1 && t.line <= 2.5, `${t.token} is ${t.size} / ${t.line}`)
    }
    assert.ok(brand.type.scale[0].size <= 96, 'display is capped at 96')
  })
}

test('the project\'s own colours land in the kit slots', () => {
  const brand = make(teal())
  const hexes = brand.colours.map((c) => c.hex)
  assert.ok(hexes.includes('#2F6F5E'), 'the base colour is the primary')
  assert.deepEqual(brand.colours.slice(0, 5).map((c) => c.id), ['primary', 'ink', 'support', 'canvas', 'accent'])
  assert.deepEqual(['action', 'text', 'panel', 'ground'].map((r) => brand.colours.some((c) => c.role === r)), [true, true, true, true],
    'theme 02 looks colours up by these roles')
})

// ---- 2. contrast on palettes that cannot be tinted ----
const ODD_PALETTES = {
  greys: ['#222222', '#555555', '#888888', '#BBBBBB', '#EEEEEE'],
  'mid greys': ['#777777', '#808080', '#888888', '#909090', '#989898'],
  'all white': ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF', '#FFFFFF'],
  'all black': ['#000000', '#000000', '#000000', '#000000', '#000000'],
  'near white': ['#FAFAFA', '#F5F5F5', '#FFFFFF'],
  'near black': ['#0A0A0A', '#111111', '#1A1A1A'],
  'pale yellow': ['#FFE600'],
  neon: ['#00FF00', '#FF00FF', '#00FFFF'],
}

for (const [label, colors] of Object.entries(ODD_PALETTES)) {
  test(`both modes keep their contrast: ${label}`, () => {
    const brand = make({ palette: palette(colors), fonts: BUNDLED_FONTS })
    for (const mode of ['light', 'dark']) {
      const r = brand.ui[mode]
      const at = (a, b) => ratio(a, b)
      assert.ok(at(r.text, r.surface) >= 4.5, `${mode} text on surface ${at(r.text, r.surface)}`)
      assert.ok(at(r.textSoft, r.raised) >= 4.5, `${mode} soft text on raised`)
      assert.ok(at(r.quiet, r.surface) >= 4.5, `${mode} quiet text on surface`)
      for (const s of ['action', 'actionHover', 'actionPressed']) assert.ok(at(r.actionLabel, r[s]) >= 4.5, `${mode} label on ${s}`)
      assert.ok(at(r.border, r.surface) >= 3, `${mode} border on surface`)
      assert.ok(at(r.focus, r.surface) >= 3, `${mode} focus on surface`)
      // a fill under 3:1 on the surface has an edge that passes, so the button is still seen (not merely exempt)
      if (at(r.action, r.surface) < 3) assert.ok(r.actionEdge && at(r.actionEdge, r.surface) >= 3, `${mode} pale action has no visible edge`)
      assert.ok(!r.actionExempt, `${mode} should use an edge, not an exemption`)
    }
  })
}

test('dark grounds stay neutral when the primary has no hue', () => {
  for (const colors of [ODD_PALETTES.greys, ODD_PALETTES['all white'], ODD_PALETTES['all black']]) {
    const dark = make({ palette: palette(colors), fonts: BUNDLED_FONTS }).ui.dark
    for (const g of ['surface', 'raised', 'sunken']) {
      const [r, g2, b] = [1, 3, 5].map((i) => parseInt(dark[g].slice(i, i + 2), 16))
      assert.ok(Math.max(r, g2, b) - Math.min(r, g2, b) <= 1, `dark ${g} ${dark[g]} carries a tint on a hueless palette`)
    }
  }
})

test('a tinted primary tints the dark grounds, so the neutral guard is not a blanket rule', () => {
  const dark = make(teal()).ui.dark
  const [r, g, b] = [1, 3, 5].map((i) => parseInt(dark.surface.slice(i, i + 2), 16))
  assert.ok(Math.max(r, g, b) - Math.min(r, g, b) >= 2, `dark surface ${dark.surface} has no tint`)
})

// ---- 3. fonts ----
const faceOf = (fonts) => make({ palette: palette(TEAL), fonts }).fonts

test('a bundled family is used as it is', () => {
  const f = faceOf(BUNDLED_FONTS)
  assert.equal(f.display.family, 'Barlow Condensed')
  assert.ok(!f.display.standIn)
  assert.deepEqual(f.display.weights, [700])
  assert.equal(f.display.file, TTF_FAMILIES['Barlow Condensed'].file)
})

test('a catalogue family without a file here keeps its name and takes its category\'s stand-in files', () => {
  const f = faceOf({ heading: face('Playfair Display', 700, 'serif'), body: face('Lora', 400, 'serif') })
  assert.equal(f.display.family, 'Playfair Display')
  assert.equal(f.display.standIn, true)
  assert.equal(f.display.file, TTF_FAMILIES['Young Serif'].file)
  assert.deepEqual(f.display.weights, TTF_FAMILIES['Young Serif'].weights)
  assert.equal(f.body.file, TTF_FAMILIES['Goudy Bookletter 1911'].file)
})

test('an unknown family becomes the stand-in\'s own family', () => {
  const f = faceOf({ heading: face('Zzyzx Display', 700, 'serif'), body: face('Nonesuch Sans', 400, 'sans-serif') })
  assert.equal(f.display.family, 'Young Serif')
  assert.equal(f.body.family, 'Commissioner')
  assert.ok(!f.display.standIn, 'a stand-in under its own name is not flagged')
})

test('a design with no fonts object still gets two usable faces', () => {
  const f = make({ palette: palette(TEAL) }).fonts
  for (const role of ['display', 'body']) {
    assert.ok(TTF_FAMILIES[Object.keys(TTF_FAMILIES).find((k) => TTF_FAMILIES[k].file === f[role].file)], `${role} has no file we hold`)
  }
})

test('family names that are property names of Object do not reach the lookup tables', () => {
  for (const family of ['__proto__', 'constructor', 'toString', 'hasOwnProperty']) {
    const f = faceOf({ heading: face(family, 700, 'constructor'), body: face(family, 400, 'toString') })
    assert.ok(Array.isArray(f.display.weights) && f.display.weights.length, `${family} left the weights empty`)
  }
})

test('a family name carrying markup or a path is refused or neutralised, never passed on', () => {
  const brand = make({ palette: palette(TEAL), fonts: { heading: face('"; } </style><script>', 700, 'serif'), body: face('../../etc/passwd', 400, 'sans-serif') } })
  for (const role of ['display', 'body']) assert.match(brand.fonts[role].family, /^[A-Za-z0-9 ]+$/)
})

// ---- wordmark and slug ----
const nameOf = (projectName) => make(teal(), projectName)

test('the wordmark keeps Latin letters, digits, spaces and . , & \' - only', () => {
  assert.equal(nameOf('Tide & Co.').name, 'Tide & Co.')
  assert.equal(nameOf(`Caf${String.fromCodePoint(0xE9)} ${String.fromCodePoint(0x1F600)}${String.fromCodePoint(0x1F9D1, 0x200D, 0x1F680)}`).name, 'Cafe')
  assert.equal(nameOf('"Quoted" <b>x</b> */ /*').name, 'Quoted bxb')
  assert.equal(nameOf('../../a\\b/c').name, 'abc')
  assert.equal(nameOf('Acme Co.').name, 'Acme Co.')
})

test('a name with nothing usable in it becomes "Your brand"', () => {
  for (const n of ['', '   ', null, '-- .. ,,', String.fromCodePoint(0x6771, 0x4EAC), String.fromCodePoint(0x1F600)]) {
    const b = nameOf(n)
    assert.equal(b.name, 'Your brand', `name ${JSON.stringify(n)}`)
    assert.equal(b.slug, 'p-your-brand')
  }
})

test('a very long name is cut, and the slug stays inside the validator\'s limit', () => {
  const b = nameOf('A'.repeat(10000))
  assert.ok(b.name.length <= 40)
  assert.ok(b.slug.length <= 41)
  assert.doesNotMatch(b.slug, /-$/)
})

test('a name that is not a string is read as text, not trusted', () => {
  assert.equal(nameOf(12345).name, '12345')
  assert.equal(nameOf('__proto__').name, 'proto')
})

// ---- 4. odd designs: a BrandInputError or a brand that renders ----
const ODD = {
  'no design': undefined,
  'a string for a design': 'hello',
  'an array for a design': [1, 2],
  'an empty design': {},
  'colours as an object': { palette: { colors: { a: '#FF0000' }, base: 7 }, fonts: BUNDLED_FONTS },
  'colours as a string': { palette: { colors: '#FF0000,#00FF00' }, fonts: BUNDLED_FONTS },
  'invalid hex values': { palette: palette(['nope', '#12', 7, null, '#GGGGGG']), fonts: BUNDLED_FONTS },
  'three-digit and lowercase hex': { palette: palette(['#2f6f5e', '#f2c14e', '#abc', 'rgb(1,2,3)']), fonts: BUNDLED_FONTS },
  'five thousand colours': { palette: palette(Array.from({ length: 5000 }, (_, i) => hue(i, 5000))), fonts: BUNDLED_FONTS },
  'fonts as strings and numbers': { palette: palette(['#2F6F5E']), fonts: { heading: 'Roboto', body: 42 } },
  'NaN and huge weights': { palette: palette(['#2F6F5E']), fonts: { heading: face('Barlow Condensed', NaN), body: face('Roboto', 1e9) } },
  'weights as words': { palette: palette(['#2F6F5E']), fonts: { heading: face('Barlow Condensed', 'bold'), body: face('Roboto', '300') } },
  'a 10,000-character family and an emoji family': { palette: palette(['#2F6F5E']), fonts: { heading: face('X'.repeat(10000), 700, 'serif'), body: face(String.fromCodePoint(0x1F600), 400, 'serif') } },
  'states, tints, gradient, logo and identity of the wrong type': { palette: palette(['#2F6F5E']), fonts: BUNDLED_FONTS, states: { success: 'red', error: null, warning: 5 }, tints: 'x', gradient: 3, logo: 'y', identity: { description: 7 } },
  'a type scale of nonsense': { palette: palette(['#2F6F5E']), fonts: BUNDLED_FONTS, typeScale: { base: -5, ratio: 0 } },
  'an enormous type scale': { palette: palette(['#2F6F5E']), fonts: BUNDLED_FONTS, typeScale: { base: 1e6, ratio: 50 } },
  'NaN and infinite type scale values': { palette: palette(['#2F6F5E', '#F2C14E']), fonts: BUNDLED_FONTS, typeScale: { base: NaN, ratio: Infinity, lineHeight: NaN } },
  'a line height of 99': { palette: palette(['#2F6F5E']), fonts: BUNDLED_FONTS, typeScale: { lineHeight: 99 } },
  ...Object.fromEntries(Object.entries(ODD_PALETTES).map(([k, colors]) => [`the ${k} palette`, { palette: palette(colors), fonts: BUNDLED_FONTS }])),
}

test('a thrown plain error comes out of projectToBrand as a BrandInputError with the cause kept', () => {
  const bad = { toString() { throw new Error('boom') } }
  assert.throws(() => projectToBrand({ design: teal(), projectName: bad }), (e) => e instanceof BrandInputError && e.cause instanceof Error && /boom/.test(e.message))
})

test('calling projectToBrand with nothing at all makes a brand from the defaults', () => {
  const brand = projectToBrand()
  assert.equal(brand.slug, 'p-your-brand')
})

/** Renders every page of both kinds in both themes in the slot edition; returns the failures as 'theme/kind/page: message'. */
function renderFailures(brand) {
  const failures = []
  for (const [dir, T] of Object.entries(THEMES)) {
    for (const kind of ['guidelines', 'uikit']) {
      let ctx
      try { ctx = makeCtx(T, 'slot', kind, loaders, brand) } catch (e) { failures.push(`${dir}/${kind}: ${e.message}`); continue }
      for (const p of PAGES[kind]) {
        try { pageDoc(ctx, T, { title: p.id, pages: [T[kind][p.id](ctx)], size: ctx.size }) } catch (e) { failures.push(`${dir}/${kind}/${p.id}: ${e.message}`) }
      }
    }
  }
  return failures
}

for (const [label, design] of Object.entries({ ...Object.fromEntries(Object.entries(REAL).map(([k, v]) => [k, v.design])), ...ODD })) {
  test(`through themes 04 and 02 in the slot edition: ${label}`, () => {
    let brand
    try { brand = make(design, 'Fuzz') } catch (e) {
      assert.ok(e instanceof BrandInputError, `${label} threw ${e && e.constructor && e.constructor.name}: ${e && e.message}`)
      return
    }
    assert.deepEqual(renderFailures(brand), [])
  })
}

test('names with an emoji, slashes, quotes and nothing at all render too', () => {
  for (const n of [`Cafe ${String.fromCodePoint(0x1F600)}`, '../../a\\b/c', `"Quoted" 'name' <b>x</b> */ /*`, '', 'A'.repeat(10000)]) {
    assert.deepEqual(renderFailures(make(teal(), n)), [], `name ${JSON.stringify(n).slice(0, 30)}`)
  }
})

// ---- 5. nothing of the sample brand leaks ----
const strings = (v, path = '', out = []) => {
  if (typeof v === 'string') out.push([path, v])
  else if (Array.isArray(v)) v.forEach((x, i) => strings(x, `${path}[${i}]`, out))
  else if (v && typeof v === 'object') for (const [k, x] of Object.entries(v)) strings(x, path ? `${path}.${k}` : k, out)
  return out
}
const SENTINEL = new RegExp(`[${String.fromCodePoint(0xE000)}-${String.fromCodePoint(0xF8FF)}]`)
// Values the themes read by name, not words the project writes: token, face and tone names, the colour ids and role names theme 02
// looks colours up by, the font files and the version number, hex colours, the shadow keyword, and the icon name beside each link label.
const STRUCTURAL = /(^|\.)(token|face|tone|role|id)$|^fonts\.|^version\.|^ui\.shadows$|links\[\d+\]\[1\]$/
const HEX_COLOUR = /^#[0-9A-Fa-f]{6}$/

test('after the slot edition swaps in placeholders, no remaining string is margin\'s copy', () => {
  const margin = new Set(strings(BRANDS.margin.data).map(([, s]) => s))
  assert.ok(margin.size > 200, 'the sample brand looks empty, so this check proves nothing')
  const designs = [teal(), { palette: palette(['#E63946']), fonts: { heading: face('Playfair Display', 700, 'serif'), body: face('Lora', 400, 'serif') } }, { palette: palette(ODD_PALETTES.greys) }]
  for (const design of designs) {
    const brand = make(design, 'Tide & Co.')
    for (const [dir, T] of Object.entries(THEMES)) {
      for (const kind of ['guidelines', 'uikit']) {
        const ctx = makeCtx(T, 'slot', kind, loaders, brand)
        const all = strings(ctx.brand)
        assert.ok(all.some(([, s]) => SENTINEL.test(s)), `${dir}/${kind}: no placeholder was applied, so there is nothing to check`)
        const leaks = all.filter(([p, s]) => !SENTINEL.test(s) && !STRUCTURAL.test(p) && !HEX_COLOUR.test(s) && margin.has(s)).map(([p, s]) => `${p}: ${s.slice(0, 40)}`)
        assert.deepEqual(leaks, [], `${dir}/${kind} still holds margin's wording`)
      }
    }
  }
})

test('CONTROL: the leak check does see margin\'s copy when it is there', () => {
  const margin = new Set(strings(BRANDS.margin.data).map(([, s]) => s))
  const brand = make(teal())
  brand.type.scale[3].use = BRANDS.margin.data.type.scale[3].use
  const leaks = strings(brand).filter(([p, s]) => !STRUCTURAL.test(p) && margin.has(s))
  assert.ok(leaks.some(([p]) => p === 'type.scale[3].use'), 'a planted margin string was not found')
})
