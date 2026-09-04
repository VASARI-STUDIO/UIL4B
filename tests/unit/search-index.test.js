// THE SEARCH INDEX AND THE TOOL TREE MUST NOT DRIFT.
//
// ── The failure this exists for ─────────────────────────────────────────────
//
// On 2026-09-03 the app could not find its own tools. `src/data/tools.jsx` kept
// a hand-written `TOOLS` array of what the product contained; `src/data/
// toolTree.js` kept `CREATE_GROUPS`, which the router actually mounts. Two
// hand-maintained lists of one reality, and search read the stale one. Verified
// in a browser against a production build, by typing and pressing Enter:
//
//   palette   → /create/color   (the colour SALES page, not the Palette Builder)
//   gradient  → /create/color
//   contrast  → /create/color
//   tint      → /create/color
//   semantic  → no result at all
//   converter → no result at all
//   alt text  → /create/ai-tools (a URL that only redirects)
//
// Seven of the thirteen live tools were unreachable by name, including the one
// the homepage own "Start with a palette" button points at. Ten more index rows
// pointed at RETIRED URLs (every /docs*, /prompts, /resources).
//
// ── Why these assertions and not a list of the thirteen tools ───────────────
//
// A test that named the tools would be a fourth copy of the same reality, and
// would go stale in exactly the way the code did. Every assertion below DERIVES
// both sides and compares them:
//
//   · toolTree.js is imported and asked what tools exist;
//   · toolIndex.js is imported and asked real queries — which is the whole
//     reason the index is plain .js with the JSX icons kept out in tools.jsx,
//     because `node --test` cannot import JSX;
//   · CreateTool.jsx LIVE_TOOLS map is read out of the source, comments
//     stripped, because it is a map of React components Node cannot import.
//
// A source read is only as good as its comment stripping — a test here once
// passed because a comment above the code still named the old value — so the
// stripper is itself asserted before it is trusted.
import test from 'node:test'
import assert from 'node:assert/strict'
import {
  CATEGORY_ENTRIES,
  CREATE_TOOL_SEARCH,
  HINT_MAX_LEN,
  TOOL_ENTRIES,
  liveDestination,
  matchRank,
  queryCommandIndex,
  searchHints,
} from '../../src/data/toolIndex.js'
import {
  CREATE_GROUPS,
  CREATE_HOMES_THAT_RENDER,
  NAV_SECTIONS,
  createRoutes,
  createTools,
  liveToolRoutes,
} from '../../src/data/toolTree.js'
import { LEGACY_REDIRECTS } from '../../src/data/legacyRoutes.js'
import { PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'

// What the two live search surfaces actually pass to the query: the localised
// index minus anything still in the workshop. Derived here the same way
// HomeCommandBar.jsx and CommandPalette.jsx derive it, so the test cannot pass
// against an index the product never queries.
const liveTools = () => TOOL_ENTRIES.filter((t) => !t.soon)
const ask = (query) => queryCommandIndex(query, { tools: liveTools(), categories: CATEGORY_ENTRIES })
// Enter opens the first hit — HomeCommandBar builds its rows tools-then-
// categories and navigates rows[0].path.
const firstHit = (query) => {
  const hit = ask(query)
  return hit.tools[0] || hit.categories[0] || null
}


test('the comment stripper works, so the source reads below can be trusted', () => {
  // Both halves matter. A stripper that removed nothing would let a comment
  // satisfy an assertion; one that ate code would make a real regression
  // invisible. Checked on a fixture AND on the real file. The fixture half now
  // lives beside the stripper in tests/unit/helpers/source-text.js — it was
  // copied into a second test file the moment a second file needed it, which is
  // the same defect this suite exists to catch, one level down.
  assertStripperWorks(assert)

  // On the real file, with tokens chosen because each appears ONLY on one side.
  // ("still in the workshop" is not one of them: it is in a comment AND in the
  // SoonState heading, which is precisely the ambiguity this guards against.)
  const createTool = stripComments(read('src/pages/CreateTool.jsx'))
  assert.ok(createTool.includes('const LIVE_TOOLS'), 'stripping ate CreateTool.jsx own code')
  assert.ok(createTool.includes('coming-title'), 'stripping ate CreateTool.jsx JSX')
  assert.ok(!createTool.includes('colorstudio-dead-sections'),
    'a comment survived stripping CreateTool.jsx')
})

/** The route keys of CreateTool.jsx LIVE_TOOLS map, read from source. */
function liveToolsMapRoutes() {
  const src = read('src/pages/CreateTool.jsx')
  const start = src.indexOf('const LIVE_TOOLS = {')
  assert.ok(start > -1, 'CreateTool.jsx no longer declares a LIVE_TOOLS map')
  const end = src.indexOf('\n}', start)
  assert.ok(end > start, 'could not find the end of the LIVE_TOOLS map')
  const block = stripComments(src.slice(start, end))
  return [...block.matchAll(/'(\/create\/[a-z0-9-]+)'\s*:/g)].map((m) => m[1])
}

// ── The divergence guard ────────────────────────────────────────────────────

test('THE ONE THAT MATTERS: LIVE_TOOLS and the tool tree name the same live tools', () => {
  // toolTree.js carries a `soon` flag per tool and its own comment tells a
  // HUMAN to keep it matching CreateTool.jsx LIVE_TOOLS map. This is that
  // instruction, checked. A tool flagged live whose route mounts nothing renders
  // the workshop state while the nav and the search offer it as finished; a tool
  // flagged soon whose route DOES mount gets dimmed in the nav and hidden from
  // search while being perfectly usable — which is what happened to File
  // Converter and Alt Text.
  const fromTree = [...liveToolRoutes()].sort()
  const fromMap = [...liveToolsMapRoutes()].sort()
  assert.ok(fromTree.length >= 10, `only ${fromTree.length} live tools — did the tree lose its groups?`)
  assert.deepEqual(fromMap, fromTree,
    'CreateTool.jsx LIVE_TOOLS and the `soon: false` tools in toolTree.js disagree. '
    + 'Flip the flag or add the component — do not let them drift.')
})

test('every Create tool in the tree is in the search index, at the tree own route', () => {
  // The additive direction. A tool added to toolTree.js and forgotten here used
  // to be simply unfindable; now the build says so.
  const byId = new Map(TOOL_ENTRIES.map((t) => [t.id, t]))
  for (const tool of createTools()) {
    const entry = byId.get(tool.id)
    assert.ok(entry, `${tool.id} is in CREATE_GROUPS but has no search index entry`)
    assert.equal(entry.path, tool.route, `${tool.id} is indexed at the wrong route`)
    assert.equal(entry.label, tool.label, `${tool.id} is indexed under a different name`)
    assert.equal(entry.soon, tool.soon, `${tool.id} live/soon status disagrees with the tree`)
  }
})

test('the index invents no Create tool the tree does not have', () => {
  // The subtractive direction, and the one that was actually broken: the index
  // carried a "Colour Studio" at /create/color that was not a tool at all, and
  // a "Component Designer" the tree had renamed.
  const known = new Set(createTools().map((t) => t.id))
  const routes = new Set(createTools().map((t) => t.route))
  for (const entry of TOOL_ENTRIES) {
    if (!entry.path.startsWith('/create/')) continue
    assert.ok(known.has(entry.id), `${entry.id} is in the search index but in no Create group`)
    assert.ok(routes.has(entry.path), `${entry.path} is offered by search but is not a tool route`)
  }
  // And no metadata key names a tool that does not exist — an orphan entry is
  // silently ignored at runtime, so nothing else would ever notice.
  for (const id of Object.keys(CREATE_TOOL_SEARCH)) {
    assert.ok(known.has(id), `CREATE_TOOL_SEARCH has search words for "${id}", which is not a tool`)
  }
})

// ── Findability: the property the founder actually cares about ──────────────

test('THE FOUNDER ONE: every live tool is found by typing its own name, and comes FIRST', () => {
  // Not "is somewhere in the results" — first, because HomeCommandBar navigates
  // to the first hit on Enter and that is how the bug was reported. Typing
  // `palette` used to open the colour sales page.
  const live = liveTools()
  assert.ok(live.length >= 13, `only ${live.length} live entries in the index`)
  for (const tool of live) {
    const first = firstHit(tool.label)
    assert.ok(first, `typing "${tool.label}" finds nothing at all`)
    assert.equal(first.path, tool.path,
      `typing "${tool.label}" opens ${first.path} rather than ${tool.path}`)
  }
})

test('the six queries from the bug report reach the tool, not the sales page', () => {
  // Stated as literal queries on purpose. They are the founder report, and this
  // assertion must not be able to pass by agreeing with a broken derivation of
  // itself. The EXPECTED side is still derived: each looks up where the tree
  // says that tool lives.
  const routeOf = (id) => createTools().find((t) => t.id === id).route
  const expected = [
    ['palette', 'palette'],
    ['gradient', 'gradient'],
    ['contrast', 'contrast'],
    ['tint', 'tint'],
    ['semantic', 'semantic'],
    ['converter', 'file-converter'],
  ]
  for (const [query, id] of expected) {
    const first = firstHit(query)
    assert.ok(first, `"${query}" returns nothing`)
    assert.equal(first.path, routeOf(id), `"${query}" opens ${first.path}`)
  }
  // And /create/color is still legitimately findable as what it is — a page
  // about colour. The bug was tool queries landing there, not its existence.
  assert.ok(ask('colour studio').categories.some((c) => c.path === '/create/color'),
    'the colour landing is a real page and must stay findable by its own name')
})

test('a label match outranks a description match', () => {
  // The mechanism behind the test above, pinned on its own so a regression
  // names the cause rather than a symptom. "tint" matched the Palette Builder
  // because palette description mentions "tints".
  assert.ok(matchRank({ label: 'Tint', keywords: [], description: '' }, 'tint')
    < matchRank({ label: 'Palette', keywords: [], description: 'with tints and shades' }, 'tint'))
  assert.ok(matchRank({ label: 'Contrast Checker', keywords: [] }, 'contrast')
    < matchRank({ label: 'Palette', keywords: ['contrast ratio'] }, 'contrast'))
})

// ── Destinations ────────────────────────────────────────────────────────────

test('nothing search offers is a retired URL', () => {
  // legacyRoutes.js forbids a redirect pointing at another redirect. Nothing
  // stopped the search index from pointing at one, and ten rows did — every
  // /docs* entry, /prompts and /resources — so a result opened a URL that
  // immediately bounced somewhere else.
  const retired = new Set(LEGACY_REDIRECTS.map(([from]) => from))
  assert.ok(retired.size >= 5, 'the redirect table looks empty — this guard would pass vacuously')
  for (const entry of [...TOOL_ENTRIES, ...CATEGORY_ENTRIES]) {
    assert.ok(!retired.has(entry.path),
      `"${entry.label}" sends visitors to ${entry.path}, which is a retired URL`)
  }
  // The resolver is what keeps that true, so check it does something.
  assert.equal(liveDestination('/prompts'), '/discover/prompts')
})

test('search never offers a Create category home that only redirects', () => {
  // CreateTool.jsx sends a live group home to its first tool, so
  // /create/typography, /create/imagery, /create/icons-emoji and
  // /create/ai-tools are bounces, and /create/components is Soon. Search used to
  // offer all five: "alt text" landed a visitor on /create/ai-tools.
  const homes = CREATE_GROUPS.map((g) => g.home)
  const offered = CATEGORY_ENTRIES.filter((c) => c.destination !== false).map((c) => c.path)
  const bounced = homes.filter((h) => !CREATE_HOMES_THAT_RENDER.includes(h))
  assert.ok(bounced.length >= 4, `expected several redirect-only category homes, found ${bounced.length}`)
  for (const home of bounced) {
    assert.ok(!offered.includes(home), `${home} only redirects and must not be a search destination`)
  }
  for (const home of CREATE_HOMES_THAT_RENDER) {
    assert.ok(offered.includes(home), `${home} is a real page and should stay findable`)
  }
  // queryCommandIndex is where that filter lives, so it holds for every caller.
  const hit = queryCommandIndex('typography', {
    tools: [],
    categories: [{ id: 'x', label: 'Typography', description: '', keywords: [], path: '/create/typography', destination: false }],
  })
  assert.equal(hit.categories.length, 0, 'a non-destination category was offered by the shared query')
})

test('every destination in the index is a route the app can render', () => {
  const known = new Set([...createRoutes(), ...Object.keys(PAGE_TITLES)])
  for (const entry of [...TOOL_ENTRIES, ...CATEGORY_ENTRIES]) {
    assert.ok(known.has(entry.path),
      `"${entry.label}" points at ${entry.path}, which is neither a Create route nor in routeMetaMap`)
  }
})

test('every live tool carries search words, so a new tool cannot ship unfindable', () => {
  for (const tool of liveTools()) {
    assert.ok(tool.description && tool.description.length > 10,
      `${tool.id} has no description for the result row`)
    assert.ok(tool.keywords.length >= 3, `${tool.id} has too few keywords to be findable`)
  }
})

// ── The placeholder hints, on BOTH surfaces ─────────────────────────────────

test('the cycled hints are real live tools, and every one finds itself', () => {
  // The hero types these into a real placeholder; PillNav types the same list
  // into a span. A hint that finds nothing is the nav telling a first-time
  // visitor about a tool that is not there — which is what the hand-kept array
  // in PillNav was doing with "palette builder" and "contrast checker".
  const hints = searchHints(liveTools())
  assert.ok(hints.length >= 6, `only ${hints.length} hints — the rule is selecting almost nothing`)
  const liveLabels = new Set(liveTools().map((t) => t.label))
  for (const hint of hints) {
    assert.ok(liveLabels.has(hint), `"${hint}" is advertised but is not a live tool`)
    assert.ok(hint.length <= HINT_MAX_LEN, `"${hint}" is ${hint.length} chars and truncates in the input`)
    const first = firstHit(hint)
    assert.ok(first, `the placeholder advertises "${hint}" and the search finds nothing for it`)
  }
  // #320 rule, kept: the hero sells things you can go and MAKE.
  for (const hint of hints) {
    const tool = TOOL_ENTRIES.find((t) => t.label === hint)
    assert.ok(tool.path.startsWith('/create/'), `"${hint}" is not a /create/ tool`)
  }
  // And nothing still in the workshop is advertised.
  const soonLabels = new Set(TOOL_ENTRIES.filter((t) => t.soon).map((t) => t.label))
  for (const hint of hints) {
    assert.ok(!soonLabels.has(hint), `"${hint}" is still in the workshop and must not be advertised`)
  }
})

test('searchHints refuses a workshop tool even when the caller forgets to filter', () => {
  // THE SUBSTITUTION THIS CATCHES, and why the test above cannot catch it.
  //
  // The assertion above calls `searchHints(liveTools())` — it filters `soon`
  // out of its OWN input and then checks the output has no `soon` in it. That
  // passes whether the rule lives in the helper or in the caller, so it was
  // measuring the test's own filter, not the product's.
  //
  // Until 2026-09-05 the rule lived only in the two callers. Both got it right,
  // so nothing was visibly wrong — but a third surface reading the signature
  // and passing the plain registry would have advertised every unbuilt tool in
  // the persistent nav, on every page, which is the exact defect #332 closed.
  //
  // So: hand it the WHOLE registry, workshop tools included, and demand it
  // still refuses them. Nothing here names a tool; both sides are derived.
  const advertised = new Set(searchHints(TOOL_ENTRIES))
  const workshop = TOOL_ENTRIES.filter((t) => t.soon)
  assert.ok(workshop.length > 0, 'no workshop tools left — this assertion has nothing to prove')
  for (const tool of workshop) {
    assert.ok(!advertised.has(tool.label),
      `searchHints advertised "${tool.label}", which has no page — the workshop filter is back in the callers`)
  }
  // And it must not have bought that by returning nothing at all.
  assert.ok(advertised.size >= 6, `only ${advertised.size} hints survive — the filter is now eating live tools`)
  // Unfiltered in must equal pre-filtered in. If these ever differ, one of the
  // two call sites is getting a different list from the other.
  assert.deepEqual(searchHints(TOOL_ENTRIES), searchHints(liveTools()),
    'searchHints answers differently depending on whether the caller pre-filtered')
})

test('PillNav writes down no tool name at all, under any variable name', () => {
  // The assertion below bans the identifier SEARCH_HINTS. That is the old array
  // by its old name, and renaming it to NAV_HINTS would walk straight past it.
  //
  // This one is structural instead: take every label the registry knows and
  // demand none of them is typed into PillNav.jsx as a literal. A hand-kept
  // list has to write the names down somewhere — that is what makes it
  // hand-kept — so it cannot survive this whatever it is called.
  //
  // NO TOOL IS NAMED HERE. The list comes from the registry, so a renamed tool
  // moves this assertion with it rather than stranding a fourth copy in a test.
  const src = stripComments(read('src/components/PillNav.jsx'))
  assert.ok(src.includes('SearchPlaceholder'), 'stripping ate PillNav own code')
  for (const tool of TOOL_ENTRIES) {
    assert.ok(!src.includes(`'${tool.label}'`) && !src.includes(`"${tool.label}"`),
      `PillNav writes "${tool.label}" down as a literal — that is a hand-kept tool list again`)
  }
})

test('PillNav no longer keeps its own hint list', () => {
  // The second half of the same defect, and the reason it is in this file: the
  // hero was fixed in #320 while the persistent nav — on every page — kept a
  // hand-written array. Read with comments stripped, because the array is
  // QUOTED in the comment that replaced it, and an assertion a comment can
  // satisfy is not an assertion.
  const src = stripComments(read('src/components/PillNav.jsx'))
  assert.ok(src.includes('SearchPlaceholder'), 'stripping ate PillNav own code')
  assert.ok(!src.includes('SEARCH_HINTS'),
    'PillNav has a hand-kept SEARCH_HINTS array again — it must read searchHints()')
  assert.match(src, /import \{ searchHints \} from '\.\.\/data\/toolIndex'/,
    'PillNav no longer reads the registry-derived hints')
  // The one thing that legitimately differs between the two surfaces.
  assert.match(src, /pnav-search-ph/, 'PillNav renders its hint into a span, not a placeholder')
})

test('HomeCommandBar and CommandPalette hide workshop tools by the tree own flag', () => {
  // They used to filter a hand-set `alpha` that disagreed with toolTree: it hid
  // File Converter and Alt Text (both live) and offered Box Shadow (not built).
  for (const file of ['src/components/HomeCommandBar.jsx', 'src/components/CommandPalette.jsx']) {
    const src = stripComments(read(file))
    assert.ok(!src.includes('.alpha'), `${file} still filters on the retired \`alpha\` flag`)
    assert.match(src, /tl\.soon/, `${file} no longer filters on the tree \`soon\` flag`)
  }
})

test('the Create mega-menu is derived from CREATE_GROUPS, not a second copy of it', () => {
  // The nav's `columns` model used to repeat every tool's id, label, route and
  // `soon` flag beside the authoritative CREATE_GROUPS, in the same file. That
  // is the defect this suite exists for, one surface over: a parallel list that
  // drifts. It HAD drifted — the menu row read "AI Image Prompt" where the tool
  // tree said "Image Prompt" — so a visitor met one name in the nav and another
  // on the page it opened.
  //
  // Derived, not asserted: this compares the rendered menu against
  // createTools() rather than naming the eighteen tools, so it cannot go stale
  // the way the code did.
  const create = NAV_SECTIONS.find((s) => s.id === 'create')
  assert.ok(create, 'no Create section in NAV_SECTIONS')
  const rows = create.columns.flat().flatMap((col) => col.tools)
  const authoritative = new Map(createTools().map((t) => [t.id, t]))

  // 1. Every menu row matches the tool tree on all three routing-relevant facts.
  for (const row of rows) {
    const tool = authoritative.get(row.id)
    assert.ok(tool, `the menu offers "${row.id}", which is not a tool in CREATE_GROUPS`)
    assert.equal(row.route, tool.route, `menu route for ${row.id} disagrees with the tool tree`)
    assert.equal(row.label, tool.label, `menu label for ${row.id} disagrees with the tool tree`)
    assert.equal(row.soon, tool.soon, `menu soon flag for ${row.id} disagrees with the tool tree`)
  }

  // 2. And nothing is missing: every tool the app mounts is reachable from the
  //    menu. The "More" safety-net column exists so an unspecced tool still
  //    renders; this asserts the spec never needs it.
  assert.deepEqual(
    rows.map((r) => r.id).sort(),
    [...authoritative.keys()].sort(),
    'the Create menu and CREATE_GROUPS list different tools',
  )
  assert.ok(
    !create.columns.flat().some((col) => col.label === 'More'),
    'a tool reached the "More" safety-net column — add it to CREATE_MENU_SPEC',
  )

  // 3. The source itself must not reintroduce the copy. A menu row that writes
  //    a route down is the thing being prevented, so the spec is ids-only.
  const src = stripComments(read('src/data/toolTree.js'))
  assert.ok(src.includes('CREATE_MENU_SPEC'), 'stripping ate toolTree own code')
  const spec = src.slice(src.indexOf('const CREATE_MENU_SPEC'), src.indexOf('function buildCreateMenu'))
  assert.ok(spec.length > 100, 'could not isolate CREATE_MENU_SPEC from the source')
  assert.ok(!spec.includes('/create/'),
    'CREATE_MENU_SPEC writes routes down again — it must carry ids only')
})

test('no mega-menu row links to a Create category home that only redirects', () => {
  // #332 fixed this in the search index; the nav is the other surface that can
  // send someone through a bounce. A category home that is not in
  // CREATE_HOMES_THAT_RENDER redirects to its first tool, so a menu row
  // pointing at one costs the visitor a navigation for nothing.
  const homes = new Set(CREATE_GROUPS.map((g) => g.home))
  const renders = new Set(CREATE_HOMES_THAT_RENDER)
  const bouncing = [...homes].filter((h) => !renders.has(h))
  assert.ok(bouncing.length, 'no redirect-only category homes — this test has lost its subject')
  for (const section of NAV_SECTIONS) {
    for (const col of section.columns.flat()) {
      for (const row of col.tools) {
        assert.ok(!bouncing.includes(row.route),
          `the ${section.label} menu row "${row.label}" points at ${row.route}, which only redirects`)
      }
    }
  }
})
