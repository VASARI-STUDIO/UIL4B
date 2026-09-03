// THE TABLES THAT SIT BESIDE THE AUTHORITATIVE ONE.
//
// CREATE_GROUPS in src/data/toolTree.js owns which tools exist, what they are
// called and where they live. Two more tables live in the SAME FILE and were
// not derived from it:
//
//   HOME_SATELLITES  — eleven rows, each carrying its own copy of a route and a
//                      hue, and three labels that had already drifted from the
//                      tree ("Semantic" for "Semantic Colour", "Contrast" for
//                      "Contrast Checker", "Gradient Generator" for "Gradient").
//   DISCOVER_GROUPS  — two of its eight rows point INTO the Create tree
//                      (/create/font-gallery and /create/icons) and typed the
//                      route out by hand, eighty lines below the table they
//                      copied it from.
//
// Being in the same file made it look safe. It is the same defect the search
// index had: a second hand-kept list of one reality, and the copy is the one
// that goes stale — #332 found the search index offering "Colour Studio" at a
// URL that was not a tool, from a table sitting a few hundred lines from the
// truth.
//
// ── What these assertions do, and what they refuse to do ────────────────────
//
// They never list the tools. Every one derives both sides: the tree is asked
// what exists, the surface is asked what it advertises, and they are compared.
// Two of them go further and read the SOURCE of the two spec tables with
// comments stripped, to assert what those tables may not SAY — because
// "presentation only, it never writes a route down" is a claim, and an
// unchecked claim is just a parallel list with better manners.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CREATE_GROUPS,
  CREATE_HOMES_THAT_RENDER,
  DISCOVER_GROUPS,
  HOME_FAMILY_LABEL,
  HOME_SATELLITES,
  HOME_WORKBENCH_TABS,
  createRoutes,
  createTools,
} from '../../src/data/toolTree.js'
import { LEGACY_REDIRECTS } from '../../src/data/legacyRoutes.js'
import { PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { arrayBlock, assertStripperWorks } from './helpers/source-text.js'

const TREE = 'src/data/toolTree.js'
const byId = () => new Map(createTools().map((t) => [t.id, t]))
const retired = () => new Set(LEGACY_REDIRECTS.map(([from]) => from))
const renderable = () => new Set([...createRoutes(), ...Object.keys(PAGE_TITLES)])
/** Create category homes that only bounce — CreateTool.jsx redirects them. */
const bouncingHomes = () =>
  CREATE_GROUPS.map((g) => g.home).filter((h) => !CREATE_HOMES_THAT_RENDER.includes(h))

test('the comment stripper works, so the two source reads below can be trusted', () => {
  assertStripperWorks(assert)
  // And on the real file, with tokens that appear on ONE side only.
  const block = arrayBlock(TREE, 'HOME_SATELLITE_SPEC')
  assert.ok(block.includes("id: 'palette'"), 'stripping ate the spec own code')
  assert.ok(!block.includes('presentation'),
    'a comment survived stripping — the route assertions below would read prose as data')
})

// ── HOME_SATELLITES ─────────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: every satellite is a real live tool, at the tree own route', () => {
  const tools = byId()
  assert.ok(HOME_SATELLITES.length >= 10,
    `only ${HOME_SATELLITES.length} satellites — the derivation dropped rows silently`)
  for (const sat of HOME_SATELLITES) {
    const tool = tools.get(sat.id)
    assert.ok(tool, `the homepage advertises "${sat.id}", which is not a tool in CREATE_GROUPS`)
    assert.equal(sat.route, tool.route, `${sat.id} is advertised at the wrong route`)
    assert.equal(sat.soon, undefined, 'a satellite must not carry its own soon flag')
    assert.ok(!tool.soon, `${sat.id} is still in the workshop and must not be on the homepage`)
    const group = CREATE_GROUPS.find((g) => g.id === tool.group)
    assert.equal(sat.hue, group.hue, `${sat.id} paints a hue its own category does not use`)
  }
})

test('the satellite spec cannot write a route or a hue down', () => {
  // The claim in the header comment above HOME_SATELLITE_SPEC, checked. A spec
  // that could name a route could point the homepage at a URL the router does
  // not have — which is exactly what the search index used to do.
  const block = arrayBlock(TREE, 'HOME_SATELLITE_SPEC')
  assert.ok(!block.includes('route:'), 'HOME_SATELLITE_SPEC declares a route again')
  assert.ok(!block.includes('hue:'), 'HOME_SATELLITE_SPEC declares a hue again')
  assert.ok(!block.includes('/create/'), 'HOME_SATELLITE_SPEC names a /create/ URL again')
})

test('every satellite resolves into a workbench mode that exists', () => {
  // `family` drives the accessible description Home.jsx attaches to each tool
  // link. An unknown family is not an error at runtime — HOME_FAMILY_LABEL
  // simply returns undefined and the description silently disappears, which is
  // the kind of failure only a test finds.
  const tabs = new Set(HOME_WORKBENCH_TABS.map((t) => t.id))
  assert.ok(tabs.size >= 4, 'the workbench has lost its tabs — this would pass vacuously')
  for (const sat of HOME_SATELLITES) {
    assert.ok(tabs.has(sat.family),
      `${sat.id} resolves into "${sat.family}", which is not a workbench mode`)
    assert.ok(HOME_FAMILY_LABEL[sat.family], `${sat.family} has no label for the hint`)
  }
})

test('a satellite label override is only kept while it says something different', () => {
  // Three overrides are deliberate: the chips are small, so Semantic Colour is
  // "Semantic" and Contrast Checker is "Contrast". An override that has become
  // identical to the tree label is a plain copy waiting to go stale, which is
  // what the other eight rows used to be.
  const tools = byId()
  const overrides = HOME_SATELLITES.filter((s) => s.label !== tools.get(s.id).label)
  assert.ok(overrides.length >= 1 && overrides.length <= 5,
    `${overrides.length} satellite labels differ from the tree — the hero is renaming the product`)
  const block = arrayBlock(TREE, 'HOME_SATELLITE_SPEC')
  const declared = [...block.matchAll(/label: '([^']+)'/g)].map((m) => m[1])
  assert.deepEqual(declared.sort(), overrides.map((s) => s.label).sort(),
    'a declared label now matches the tree label — delete the override, do not keep a copy')
})

// ── DISCOVER_GROUPS ─────────────────────────────────────────────────────────

test('no Discover row sends a visitor through a bounce or a 301', () => {
  // The defect class #332 fixed in the search index, checked on the other
  // surface that links into the Create tree. A row pointing at a retired URL
  // 301s; one pointing at a live category home is redirected by CreateTool.jsx
  // to that group first tool. Both are a click spent arriving somewhere else.
  const dead = retired()
  const bounces = bouncingHomes()
  assert.ok(dead.size >= 5 && bounces.length >= 4, 'the guards look empty — this would pass vacuously')
  for (const row of DISCOVER_GROUPS) {
    assert.ok(!dead.has(row.route),
      `Discover row "${row.label}" points at ${row.route}, which is a retired URL`)
    assert.ok(!bounces.includes(row.route),
      `Discover row "${row.label}" points at ${row.route}, a category home that only redirects`)
  }
})

test('every Discover destination is a route the app can render', () => {
  const known = renderable()
  assert.ok(DISCOVER_GROUPS.length >= 6, `only ${DISCOVER_GROUPS.length} Discover rows`)
  for (const row of DISCOVER_GROUPS) {
    assert.ok(row.route, `Discover row "${row.label}" has no destination at all`)
    assert.ok(known.has(row.route),
      `"${row.label}" points at ${row.route}, which is neither a Create route nor in routeMetaMap`)
  }
})

test('a Discover row into the Create tree takes the tree route AND the tree soon flag', () => {
  // The additive direction. Both rows that point into Create name a tool id
  // now, so the day a tool goes back into the workshop its Discover card dims
  // on the same edit — before this, `soon: false` was typed here and the tree
  // was the only thing that knew otherwise.
  const tools = createTools()
  const intoCreate = DISCOVER_GROUPS.filter((row) => row.route.startsWith('/create/'))
  assert.ok(intoCreate.length >= 2,
    `${intoCreate.length} Discover rows point into Create — the derivation lost one`)
  for (const row of intoCreate) {
    const tool = tools.find((t) => t.route === row.route)
    assert.ok(tool, `"${row.label}" points at ${row.route}, which is not a tool route`)
    assert.equal(row.soon, tool.soon,
      `"${row.label}" is listed as ${row.soon ? 'soon' : 'live'} and the tree disagrees`)
  }
})

test('the Discover spec writes no /create/ route down', () => {
  // The counterpart to the satellite assertion. The surfaces the Create tree
  // does NOT own still declare their own route — nothing else declares them —
  // but a /create/ URL has an owner, and this is what stops a second copy of
  // one reappearing here.
  const block = arrayBlock(TREE, 'DISCOVER_SPEC')
  assert.ok(block.includes("id: 'palette-library'"), 'stripping ate the spec own code')
  assert.ok(!block.includes('/create/'),
    'DISCOVER_SPEC types a /create/ route again — name the tool id and let the tree answer')
  assert.match(block, /tool: '/, 'no Discover row names a tool id any more')
})
