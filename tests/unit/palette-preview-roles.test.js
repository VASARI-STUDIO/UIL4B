// The roles the Palette Builder preview paints, checked as numbers.
//
// derivePaletteRoles() hands the preview scenes the five brand slots the CSS
// export writes plus a derived neutral ramp and success / warning / error /
// info colours. Four things have to hold for any palette a user can build:
//
//   1. The ink roles clear 4.5:1 and the fill roles 3:1 on the grounds they
//      are painted on, in both modes.
//   2. The error colour stays tellable from a red brand (20 degrees of OKLCH
//      hue or more).
//   3. The five brand roles are the SAME hex values the export writes.
//   4. Every --pv-* the stylesheet reads is set on the scene root, so no rule
//      silently paints nothing.
//
// The palettes come from a seeded generator, so a rare miss is a repeatable
// failure and not an intermittent one.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { contrastRatio, hexToOklch } from '../../src/utils/colors.js'
import {
  BRAND_ROLES, SEMANTIC_ROLES, derivePaletteRoles, oklchToHex, pvVars,
} from '../../src/utils/palettePreviewRoles.js'
import { stripJs } from '../helpers/strip-comments.js'
import { ALL_CSS } from './appStylesheets.js'

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// A random palette of 3 to 5 slots. A quarter of them put a red-ish colour in
// the primary slot, because that is the only case that moves the error hue.
function randomPalette(rnd, forceRedPrimary = false) {
  const n = 3 + Math.floor(rnd() * 3)
  const out = []
  for (let i = 0; i < n; i++) {
    const hex = '#' + [0, 0, 0].map(() => Math.floor(rnd() * 256).toString(16).padStart(2, '0')).join('')
    out.push(hex)
  }
  if (forceRedPrimary) out[0] = oklchToHex(0.45 + rnd() * 0.3, 0.1 + rnd() * 0.1, 10 + rnd() * 40)
  return out
}

const MODES = ['light', 'dark']
const PALETTES = 3000 // x 2 modes = 6,000 role sets per sweep

test('1 . ink roles clear 4.5:1 and fill roles 3:1 on the grounds they are painted on', () => {
  const rnd = mulberry32(20261027)
  const misses = []
  let pairs = 0
  const check = (label, fg, bg, floor) => {
    pairs++
    const cr = contrastRatio(fg, bg)
    if (cr < floor && misses.length < 12) misses.push(`${label}: ${fg} on ${bg} = ${cr.toFixed(3)}:1 (needs ${floor})`)
  }
  for (let i = 0; i < PALETTES; i++) {
    const pal = randomPalette(rnd, i % 4 === 0)
    for (const mode of MODES) {
      const r = derivePaletteRoles(pal, { mode })
      const tag = `${mode} ${pal.join(',')}`
      for (const g of r.inkGrounds) {
        check(`${tag} text`, r.text, g, 4.5)
        check(`${tag} muted`, r.muted, g, 4.5)
        check(`${tag} primaryInk`, r.primaryInk, g, 4.5)
        check(`${tag} accentInk`, r.accentInk, g, 4.5)
      }
      check(`${tag} onPrimary`, r.onPrimary, r.primary, 4.5)
      for (const role of SEMANTIC_ROLES) {
        check(`${tag} ${role} ink on surface`, r[role].ink, r.surface, 4.5)
        check(`${tag} ${role} ink on tint`, r[role].ink, r[role].tint, 4.5)
        check(`${tag} ${role} fill on surface`, r[role].fill, r.surface, 3)
      }
    }
  }
  assert.ok(pairs >= 150000, `the sweep ran ${pairs} pairs, fewer than it claims to`)
  assert.equal(misses.length, 0, 'these pairs miss their floor:\n  ' + misses.join('\n  '))
})

const QUANTISATION_ALLOWANCE = 4

test('2 . the error colour stays at least 20 degrees of OKLCH hue from the primary', () => {
  const rnd = mulberry32(20261028)
  const gap = (a, b) => { const d = Math.abs(a - b) % 360; return d > 180 ? 360 - d : d }
  let shifted = 0
  let checked = 0
  let worst = Infinity
  const misses = []
  for (let i = 0; i < PALETTES; i++) {
    const pal = randomPalette(rnd, i % 2 === 0)
    for (const mode of MODES) {
      const r = derivePaletteRoles(pal, { mode })
      checked++
      if (r.errorShifted) shifted++
      // The engine's own number (strict), and the hue of the hex that is
      // actually painted. A painted colour is rounded to 8-bit channels and a
      // colour this muted moves up to about 3.5 degrees of hue when rounded, so
      // the painted gap gets QUANTISATION_ALLOWANCE and no more.
      const declared = gap(r.error.hue, hexToOklch(pal[0])[2])
      const painted = gap(hexToOklch(r.error.fill)[2], hexToOklch(pal[0])[2])
      worst = Math.min(worst, declared, painted + QUANTISATION_ALLOWANCE)
      if ((declared < 20 || painted < 20 - QUANTISATION_ALLOWANCE) && misses.length < 10) {
        misses.push(`${mode} primary ${pal[0]} (hue ${hexToOklch(pal[0])[2]}) error ${r.error.fill}: declared gap ${declared.toFixed(1)}, painted gap ${painted.toFixed(1)}`)
      }
    }
  }
  // Positive control: a sweep that never met a red brand proves nothing about
  // the shift, and the flag the legend reads must be set when it happened.
  assert.ok(shifted > checked * 0.1, `only ${shifted} of ${checked} role sets needed the shift - the sweep is not reaching red brands`)
  assert.equal(misses.length, 0, `error sits too close to the primary (worst gap ${worst.toFixed(1)}):\n  ` + misses.join('\n  '))
})

test('3 . the five brand roles are exactly the hex values the CSS export writes', () => {
  // The export lives in PaletteBuilder.jsx as `--color-${ROLES[i].toLowerCase()}`
  // over the adjusted palette. Read the real ROLES list so a reorder there
  // fails here, then rebuild the export text the same way and parse it back.
  const src = stripJs(fs.readFileSync(path.join(process.cwd(), 'src/pages/PaletteBuilder.jsx'), 'utf8'))
  const m = src.match(/const ROLES = \[([^\]]+)\]/)
  assert.ok(m, 'PaletteBuilder no longer declares ROLES')
  const exportRoles = [...m[1].matchAll(/'([A-Z]+)'/g)].map((x) => x[1].toLowerCase())
  assert.deepEqual(exportRoles, BRAND_ROLES, 'the export role order and the preview brand roles have drifted apart')
  assert.match(src, /--color-\$\{role\}: \$\{c\};/, 'the export no longer writes --color-{role}')

  const rnd = mulberry32(20261029)
  let compared = 0
  for (let i = 0; i < 400; i++) {
    const pal = [...randomPalette(rnd), ...randomPalette(rnd)].slice(0, 5)
    const exported = pal.map((c, k) => `  --color-${exportRoles[k]}: ${c};`).join('\n')
    const fromExport = Object.fromEntries([...exported.matchAll(/--color-([a-z]+): (#[0-9a-f]{6});/g)].map((x) => [x[1], x[2]]))
    for (const mode of MODES) {
      const r = derivePaletteRoles(pal, { mode })
      for (const role of BRAND_ROLES) {
        compared++
        assert.equal(r[role].toLowerCase(), fromExport[role].toLowerCase(), `${mode} ${role} differs from the export for ${pal.join(',')}`)
      }
    }
  }
  assert.equal(compared, 400 * 2 * 5)
})

test('4 . every --pv-* the stylesheet reads is set by pvVars', () => {
  const css = stripJs(ALL_CSS)
  const used = new Set([...css.matchAll(/var\((--pv-[a-z0-9-]+)/g)].map((x) => x[1]))
  const set = new Set(Object.keys(pvVars(derivePaletteRoles(['#3b5bdb', '#f08c00', '#0ca678', '#e8f0fe', '#1c2541'], {}))))
  // A bar's height or a progress fill's width is set on that one element, not
  // on the root; those names count as set when the component writes them.
  const scenes = stripJs(fs.readFileSync(path.join(process.cwd(), 'src/components/palette/PalettePreview.jsx'), 'utf8'))
  for (const [, name] of scenes.matchAll(/style=\{\{\s*'(--pv-[a-z0-9-]+)'\s*:/g)) set.add(name)
  // The hit outline colour is read with a fallback (--pv-text) and set only by
  // the Contrast Checker, on its own example wrapper (PairExample.jsx), because
  // there the text colour can be the field colour. Its setter must stay there.
  const SET_BY_CONTRAST_CHECKER = ['--pv-hit']
  const checkerSetters = stripJs([
    'src/components/palette/PairExample.jsx', 'src/styles/pages/contrast.css',
  ].map((f) => fs.readFileSync(path.join(process.cwd(), f), 'utf8')).join('\n'))
  for (const name of SET_BY_CONTRAST_CHECKER) {
    assert.match(checkerSetters, new RegExp(`['"]${name}['"]\\s*:|${name}\\s*:\\s*[#\\w]`), `the Contrast Checker no longer sets ${name}`)
    assert.match(css, new RegExp(`var\\(${name},`), `${name} is no longer read with a fallback, so it cannot be left to the Contrast Checker`)
    set.add(name)
  }
  assert.ok(used.size > 15, `only ${used.size} --pv-* names found in the stylesheets - the scan is not reading the preview CSS`)
  const orphans = [...used].filter((name) => !set.has(name)).sort()
  assert.deepEqual(orphans, [], 'these custom properties are read by the stylesheet but never set on the scene root')
})

test('5 . every value pvVars sets is a colour, for a full, a short and an empty palette', () => {
  for (const pal of [['#3b5bdb', '#f08c00', '#0ca678', '#e8f0fe', '#1c2541'], ['#336699'], [], null, ['nope']]) {
    for (const mode of MODES) {
      const vars = pvVars(derivePaletteRoles(pal, { mode }))
      for (const [name, value] of Object.entries(vars)) {
        // --pv-pborder is the one role that may be the keyword transparent.
        assert.match(value, name === '--pv-pborder' ? /^(#[0-9a-f]{6}|transparent)$/i : /^#[0-9a-f]{6}$/i,
          `${name} for ${JSON.stringify(pal)} (${mode}) is "${value}"`)
      }
    }
  }
})

// A grey has no hue: the display conversion prints chroma 0 and hue 0 for every
// pure grey, and a grey primary gives grey neutrals rather than a tinted cast.
test('greys read as hue-less in OKLCH, and a grey primary keeps its neutrals grey', () => {
  for (let v = 0; v <= 255; v += 15) {
    const h = v.toString(16).padStart(2, '0')
    const [, c, hue] = hexToOklch(`#${h}${h}${h}`)
    assert.equal(c, 0, `#${h}${h}${h} chroma`)
    assert.equal(hue, 0, `#${h}${h}${h} hue`)
  }
  for (const mode of MODES) {
    const r = derivePaletteRoles(['#808080', '#2563EB', '#F2C14E'], { mode })
    for (const g of [r.canvas, r.surface]) {
      const [, gc] = hexToOklch(g)
      assert.ok(gc <= 0.002, `${mode} ground ${g} should be grey, chroma ${gc}`)
    }
  }
})
