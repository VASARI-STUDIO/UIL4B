// The Palette Builder's preview list: how many previews there are, how they are
// grouped, which are free, and that each one has a loader to open it.
//
// The list is the Pro gate and the viewer's order (the arrow keys walk it), so a
// scene added to it without a loader would open onto the "unavailable" fallback,
// and a loader with no scene would be a chunk nothing can reach.
//
// To make it fail: add a scene to PREVIEW_SCENES without a loader in
// examples/registry.js, mark a Pro scene `free: true`, or put a scene in a group
// that PREVIEW_GROUPS does not list (src/data/palettePreviewScenes.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { PREVIEW_GROUPS, PREVIEW_SCENES, DEFAULT_SCENE, sceneById, scenesToPreload } from '../../src/data/palettePreviewScenes.js'
import { CATS, LIMITS, money, tennerVars } from '../../src/components/palette/examples/Tenner.data.js'
import { derivePaletteRoles, pairRoles } from '../../src/utils/palettePreviewRoles.js'
import { stripJs } from '../helpers/strip-comments.js'

const read = (rel) => stripJs(fs.readFileSync(path.join(process.cwd(), rel), 'utf8'))

// The registry imports React components, so it is read as source: the ids on the
// left of its LOADERS table are the scenes it can open.
const loaderIds = () => {
  const table = read('src/components/palette/examples/registry.js').match(/const LOADERS = \{([^}]*)\}/)
  assert.ok(table, 'registry.js no longer has a LOADERS table')
  return [...table[1].matchAll(/^\s*(\w+):\s*\(\)\s*=>\s*import\(/gm)].map((m) => m[1])
}

test('the list has twelve previews and no duplicate ids', () => {
  assert.equal(PREVIEW_SCENES.length, 12)
  assert.equal(new Set(PREVIEW_SCENES.map((s) => s.id)).size, PREVIEW_SCENES.length)
})

test('previews are in the rail order, with these names', () => {
  assert.deepEqual(PREVIEW_SCENES.map((s) => `${s.id}:${s.name}`), [
    'energy:Energy dashboard',
    'trail:Trail run app',
    'card:Spending card',
    'booking:Booking page',
    'report:Sales report',
    'editorial:Editorial hero',
    'product:Product page',
    'studio:Architect portfolio',
    'email:Order email',
    'coffee:Coffee bag',
    'shopfront:Shopfront',
    'stationery:Stationery',
  ])
})

test('previews are grouped product (5), marketing (4) and brand (3), and no group is empty', () => {
  assert.deepEqual(PREVIEW_GROUPS.map((g) => g.id), ['product', 'marketing', 'brand'])
  const sizes = { product: 5, marketing: 4, brand: 3 }
  for (const g of PREVIEW_GROUPS) {
    assert.equal(PREVIEW_SCENES.filter((s) => s.group === g.id).length, sizes[g.id], `${g.id} holds the wrong number of previews`)
  }
  for (const s of PREVIEW_SCENES) {
    assert.ok(PREVIEW_GROUPS.some((g) => g.id === s.group), `${s.id} is in "${s.group}", which is not a listed group`)
  }
})

test('the retired states group and its Invoices and Settings scenes are gone', () => {
  assert.ok(!PREVIEW_GROUPS.some((g) => g.id === 'states'))
  assert.ok(!PREVIEW_SCENES.some((s) => s.id === 'invoices' || s.id === 'settings'))
})

test('the list is in group order, because the arrow keys walk it', () => {
  const order = PREVIEW_GROUPS.map((g) => g.id)
  const groups = PREVIEW_SCENES.map((s) => order.indexOf(s.group))
  assert.deepEqual(groups, [...groups].sort((a, b) => a - b))
})

test('the free previews are exactly energy, trail, booking, editorial, product and email', () => {
  assert.deepEqual(PREVIEW_SCENES.filter((s) => s.free).map((s) => s.id).sort(), ['booking', 'editorial', 'email', 'energy', 'product', 'trail'])
  assert.deepEqual(PREVIEW_SCENES.filter((s) => !s.free).map((s) => s.id).sort(), ['card', 'coffee', 'report', 'shopfront', 'stationery', 'studio'])
})

test('the default preview is free, so a free account never opens onto a blurred scene', () => {
  assert.equal(sceneById(DEFAULT_SCENE).free, true)
  assert.equal(sceneById('no-such-scene').id, DEFAULT_SCENE)
})

test('every preview is an example with a loader, and every loader has a preview', () => {
  const ids = loaderIds()
  assert.deepEqual([...ids].sort(), PREVIEW_SCENES.map((s) => s.id).sort())
  for (const s of PREVIEW_SCENES) assert.equal(s.example, true, `${s.id} is not marked as an example`)
})

test('the viewer wraps each example only, with no scene table left for the retired scenes', () => {
  const viewer = read('src/components/palette/PalettePreview.jsx')
  assert.match(viewer, /EXAMPLES\[scene\.id\]/)
  assert.doesNotMatch(viewer, /\bSCENES\b/)
})

test("Tenner's error quotes the Eating out spend, and the limit really is under it", () => {
  const eating = CATS.find((c) => c.name === 'Eating out')
  assert.ok(LIMITS.eating.error.includes(money(eating.amount)), 'the error message no longer prints the Eating out amount')
  assert.ok(LIMITS.eating.limit < eating.amount, 'the limit is no longer under the spend, so the error is not true')
})

test("Tenner's Limits form is left out of a two-colour pair and its focus ring is always a real colour", () => {
  assert.match(read('src/components/palette/examples/Tenner.jsx'), /\{!pair && <Limits \/>\}/)
  assert.equal(tennerVars(pairRoles('#222222', '#fafafa')).pair, true)
  const roles = derivePaletteRoles(['#f2c14e', '#1c2541', '#ffd43b', '#e8f0fe', '#0b132b'], { mode: 'light' })
  const { vars, pair } = tennerVars(roles)
  assert.equal(pair, false)
  assert.match(vars['--ty-ring'], /^#[0-9a-f]{6}$/i)
})

// A Pro scene's chunk holds its markup, copy and layout, so the idle preload of the
// open scene's neighbours must skip any scene this viewer cannot open.
// To make it fail: drop `!isLocked(s)` from scenesToPreload (src/data/palettePreviewScenes.js).
test('a free viewer is never sent a neighbouring Pro scene', () => {
  const free = (s) => !s.free
  assert.deepEqual(scenesToPreload('trail', free).map((s) => s.id), ['energy'])
  assert.deepEqual(scenesToPreload('editorial', free).map((s) => s.id), ['product'])
  assert.deepEqual(scenesToPreload('product', free).map((s) => s.id), ['editorial'])
  for (const open of PREVIEW_SCENES) {
    for (const s of scenesToPreload(open.id, free)) assert.equal(s.free, true, `${open.id} would preload Pro scene ${s.id}`)
  }
})

test('a viewer whose plan is still loading is sent no Pro scene either', () => {
  const pending = (s) => !s.free
  for (const open of PREVIEW_SCENES) {
    assert.ok(scenesToPreload(open.id, pending).every((s) => s.free), open.id)
  }
})

test('a Pro viewer still gets both neighbours', () => {
  const pro = () => false
  assert.deepEqual(scenesToPreload('trail', pro).map((s) => s.id), ['energy', 'card'])
  assert.deepEqual(scenesToPreload('energy', pro).map((s) => s.id), ['trail'])
})

test('the dialog preloads through scenesToPreload with its own isLocked', () => {
  const src = read('src/components/palette/PalettePreviewDialog.jsx')
  assert.match(src, /scenesToPreload\(scene\.id, isLocked\)/)
  assert.doesNotMatch(src, /PREVIEW_SCENES\[i - 1\]/, 'an unfiltered neighbour preload is back')
})
