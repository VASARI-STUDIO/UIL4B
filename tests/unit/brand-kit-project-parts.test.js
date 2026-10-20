// A walkthrough that ends in a saved project must end in a project whose parts
// are all filled, with the palette the walkthrough showed. These pin the pieces
// that used to drop that on the way: parts moved past with Next, the tints part
// nothing wrote, and the Colour Studio rebuilding a five-colour Auto palette as
// one colour.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

import { BRAND_KIT_STEPS, savePatch } from '../../src/utils/brandKitGuide.js'
import { projectDigest, partsPresent } from '../../src/utils/userHome.js'
import { DEFAULT_DESIGN } from '../../src/data/designDefaults.js'
import { deriveTints, tintsStale, tintsCurrent } from '../../src/utils/projectTints.js'
import { reconcileStudioPalette, sameColours, studioBaseColours } from '../../src/utils/studioPalette.js'
import { projectSnapshot } from '../../src/utils/designPatch.js'
import { generateHarmony, applyAdjust } from '../../src/utils/colors.js'

const FIVE = ['#1D3557', '#E63946', '#F1FAEE', '#A8DADC', '#457B9D']
const ALL = BRAND_KIT_STEPS.map((s) => s.id)
const clone = (o) => JSON.parse(JSON.stringify(o))

/** What saveProject keeps: the real snapshot builder, given the walkthrough's patch. */
const saved = (design, accepted) => projectSnapshot(design, { patch: savePatch(design, accepted) })
const withPalette = (colors) => ({ ...clone(DEFAULT_DESIGN), palette: { ...DEFAULT_DESIGN.palette, base: colors[0], harmony: 'auto', colors, extraColors: [] } })

test('default steps, every Next pressed: the saved project has every part filled', () => {
  const design = withPalette(FIVE)
  assert.equal(projectDigest({ design }).done, 1 + 0, 'before the patch only the palette reads as built')
  const digest = projectDigest({ design: saved(design, ALL) })
  assert.equal(digest.done, digest.total)
  assert.equal(digest.total, 4)
  assert.deepEqual(digest.colors, FIVE, 'the palette keeps all five colours')
})

test('edited steps, every Next pressed: same result, edits kept', () => {
  const design = withPalette(FIVE)
  design.fonts.heading = { family: 'Fraunces', weight: 700, category: 'serif' }
  design.typeScale.base = 18
  const out = saved(design, ALL)
  assert.equal(projectDigest({ design: out }).done, 4)
  assert.equal(out.fonts.heading.family, 'Fraunces')
  assert.equal(out.typeScale.base, 18)
})

test('a part never moved past, with its defaults, stays open: Fill the gaps is still earned', () => {
  const out = saved(withPalette(FIVE), ['color'])
  const digest = projectDigest({ design: out })
  assert.equal(digest.done < digest.total, true)
  assert.deepEqual(digest.missing.map((m) => m.id).sort(), ['fonts', 'type-scale'])
})

test('no palette work, no derived tints: a blank design does not read as nearly done', () => {
  const patch = savePatch(clone(DEFAULT_DESIGN), ['fonts', 'typescale'])
  assert.equal(patch.tints, undefined)
  assert.equal(projectDigest({ design: saved(clone(DEFAULT_DESIGN), ['fonts', 'typescale']) }).done, 2)
})

test('a tint ramp made from the active colour is kept, not replaced by the derived one', () => {
  const design = withPalette(FIVE)
  design.tints = { ...design.tints, scale: ['#111111', '#222222'], from: FIVE[0] }
  assert.equal(savePatch(design, ALL).tints, undefined)
  assert.deepEqual(saved(design, ALL).tints.scale, ['#111111', '#222222'])
  assert.equal(tintsCurrent(design), true)
})

test('a tint ramp made from another colour is re-derived at save, keeping the tint settings', () => {
  const design = withPalette(FIVE)
  design.tints = { ...design.tints, lumBias: 70, satDecay: 9, scale: ['#111111', '#222222'], from: '#FF0000' }
  assert.equal(tintsStale(design.tints, FIVE[0]), true)
  const out = saved(design, ALL)
  assert.equal(out.tints.scale.length, 11)
  assert.equal(out.tints.from, FIVE[0])
  assert.equal(out.tints.lumBias, 70, 'the saved settings survive the re-derive')
  assert.equal(out.tints.satDecay, 9)
  assert.equal(tintsCurrent({ palette: out.palette, tints: out.tints }), true)
})

test('the active colour, not the first, decides whether a ramp is current', () => {
  const design = withPalette(FIVE)
  design.palette.activeIdx = 2
  design.tints = { ...design.tints, scale: ['#111111'], from: FIVE[0] }
  assert.equal(savePatch(design, ALL).tints.from, FIVE[2])
})

test('a ramp with no record of its colour is left alone (legacy), and is not called current', () => {
  const design = withPalette(FIVE)
  design.tints = { ...design.tints, scale: ['#111111', '#222222'] }
  assert.equal(tintsStale(design.tints, FIVE[0]), false)
  assert.equal(savePatch(design, ALL).tints, undefined)
  assert.equal(tintsCurrent(design), false)
})

test('from compares without regard to case, and derived tints record it', () => {
  assert.equal(tintsStale({ scale: ['#111111'], from: FIVE[0].toLowerCase() }, FIVE[0]), false)
  assert.equal(deriveTints(withPalette(FIVE)).from, FIVE[0])
})

test('the saved snapshot applies identityName and merges a patch one level deep', () => {
  const base = { identity: { name: 'Old', tag: 'x' }, tints: { lumBias: 70, scale: [] } }
  const out = projectSnapshot(base, { identityName: 'New', patch: { tints: { scale: ['#111111'] }, chosen: { fonts: true } } })
  assert.deepEqual(out.identity, { name: 'New', tag: 'x' })
  assert.deepEqual(out.tints, { lumBias: 70, scale: ['#111111'] })
  assert.deepEqual(out.chosen, { fonts: true })
  assert.equal(base.tints.scale.length, 0, 'the working design is not mutated')
})

test('chosen only counts when it is literally true', () => {
  const d = { ...clone(DEFAULT_DESIGN), chosen: { fonts: 'yes', palette: true } }
  const p = partsPresent(d)
  assert.equal(p.fonts, false)
  assert.equal(p.palette, true)
})

test('derived tints are the eleven-stop ramp of the active colour', () => {
  const t = deriveTints(withPalette(FIVE))
  assert.equal(t.scale.length, 11)
  assert.equal(deriveTints({ palette: {} }), null)
})

// ── The Colour Studio must not rebuild a smaller palette ───────────────────
/** The studio's own assembly (the function the page calls), then the lens it shows. */
const studioColours = (palette) => applyAdjust(studioBaseColours(palette), reconcileStudioPalette(palette).globalAdjust)

test('Auto harmony generates one colour, which is why the studio shrank palettes', () => {
  assert.equal(generateHarmony('#0051FF', 'auto').length, 1)
})

test('a five-colour Auto palette stays five colours in the studio', () => {
  const palette = { base: FIVE[0], harmony: 'auto', colors: FIVE, extraColors: [], globalAdjust: { h: 0, s: 0, b: 0, temp: 0 } }
  assert.equal(sameColours(studioColours(palette), FIVE), true)
})

test('eight colours with three extras, and a palette with a lens, keep every colour', () => {
  const eight = [...FIVE, '#222222', '#888888', '#DDDDDD']
  const p8 = { base: eight[0], harmony: 'auto', colors: eight, extraColors: eight.slice(5), globalAdjust: {} }
  assert.equal(sameColours(studioColours(p8), eight), true)
  const lens = { h: 10, s: 0, b: 0, temp: 0 }
  const shown = applyAdjust(FIVE, lens)
  const pl = { base: FIVE[0], harmony: 'analogous', colors: shown, baseColors: FIVE, extraColors: [], globalAdjust: lens }
  assert.equal(sameColours(studioColours(pl), shown), true)
})

test('a four-colour palette whose stored harmony makes five stays four', () => {
  const four = FIVE.slice(0, 4)
  assert.equal(generateHarmony(four[0], 'monochromatic').length > 4, true, 'the harmony alone would pad it')
  const palette = { base: four[0], harmony: 'monochromatic', colors: four, extraColors: [] }
  assert.deepEqual(studioBaseColours(palette), four)
})

test('stale extra colours do not pad a saved palette past its own colours', () => {
  const four = FIVE.slice(0, 4)
  const palette = { base: four[0], harmony: 'monochromatic', colors: four, extraColors: ['#222222', '#888888', '#DDDDDD', '#999999'] }
  assert.equal(studioBaseColours(palette).length, 4)
  assert.equal(sameColours(studioColours(palette), four), true)
})

test('a palette with one colour has nothing to preserve beyond its base', () => {
  assert.equal(reconcileStudioPalette({ base: '#0051FF', harmony: 'auto', colors: ['#0051FF'] }), null)
})

// ── Sources: who writes what ───────────────────────────────────────────────
const read = (p) => readFileSync(new URL(`../../${p}`, import.meta.url), 'utf8')

test('the Tint tool writes the project tints and never the palette', () => {
  const src = read('src/pages/TintTool.jsx')
  assert.match(src, /setTints\(\{ scale: keptRamp \}\)/)
  assert.doesNotMatch(src, /setPalette|palette:\s*\{/)
})

test('the Colour Studio skips a first palette write that only restates the project', () => {
  const src = read('src/pages/ColorStudio.jsx')
  assert.match(src, /first && sameColours\(design\?\.palette\?\.colors, allColors\)/)
})

test('the pages and the context call the shared functions these tests exercise', () => {
  assert.match(read('src/pages/ColorStudio.jsx'), /studioRoleCount\(colors, reconciled\)/)
  assert.match(read('src/pages/ColorStudio.jsx'), /tintsStale\(design\?\.tints, activeColor\)/)
  assert.match(read('src/pages/TintTool.jsx'), /tintsStale\(design\?\.tints, projectHex\)/)
  assert.match(read('src/contexts/ProjectContext.jsx'), /projectSnapshot\(base, opts\)/)
})
