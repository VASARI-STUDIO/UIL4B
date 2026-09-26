// The guard on what /help and /principles are allowed to say.
//
// WHAT THIS IS FOR. The page /help replaced carried a hand-typed inventory of
// tools and a hand-typed list of privacy facts, and three of them were false by
// the time anyone read them again: two retired tool names advertised as live,
// one tool advertised as two, and "no third-party analytics trackers" on a site
// that mounts @vercel/analytics on every route. None of it could fail a test,
// because none of it was connected to anything.
//
// So neither page is allowed to state a fact it did not read from the module
// that owns the fact, and this file is what enforces that. It follows the shape
// of tests/unit/learn-figures.test.js: recompute rather than quote, read source
// back rather than trust a constant, and hold a positive control beside every
// absence so a gutted table cannot pass by being empty.
import test from 'node:test'
import assert from 'node:assert/strict'

import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { HELP_ANSWERS, HELP_ROUTES, HELP_STARTS, LIVE_TOOLS, SOON_TOOLS, STARTS_WITH_CONTENT } from '../../src/data/helpStart.js'
import { DESIGN_PRINCIPLES, PRINCIPLE_ROUTES } from '../../src/data/designPrinciples.js'
import { DEFAULT_DESIGN, tintConfigFor } from '../../src/data/designDefaults.js'
import { EXPORT_FORMATS, freeFormats, proOnlyFormats, unbuiltFormats } from '../../src/config/exportFormats.js'
import { CREATE_GROUPS } from '../../src/data/toolTree.js'
import { LEGACY_REDIRECTS } from '../../src/data/legacyRoutes.js'
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { isPrivateRoute, isSoonRoute } from '../../src/utils/routeMeta.js'
import { contrastRatio, generateTintScale, T_LABELS } from '../../src/utils/colors.js'
import { stepPx } from '../../src/utils/fluidType.js'
// Reads the WHOLE app stylesheet, not global.css alone. The rules this file
// asserts on were split out of global.css into src/styles/deferred/*.css on
// 2026-09-13; a test that keeps reading one file after a lift like that does
// not go red, it goes VACUOUS. See tests/unit/appStylesheets.js.
import { ALL_CSS } from './appStylesheets.js'

const CSS = ALL_CSS
const PROOFS_SRC = stripComments(read('src/components/SystemProofs.jsx'))
const PRINCIPLES_PAGE = stripComments(read('src/pages/DesignPrinciples.jsx'))

const RETIRED = new Set(LEGACY_REDIRECTS.map(([from]) => from))

/* ── every destination both pages promise ────────────────────────────────── */

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

test('every route /help and /principles link to is live, public and not retired', () => {
  const routes = [...HELP_ROUTES, ...PRINCIPLE_ROUTES]

  // POSITIVE CONTROL FIRST. Both lists are derived from their tables, so an
  // emptied table would make the loop below pass by never running.
  assert.ok(routes.length >= 9, `only ${routes.length} routes are promised; a table has been gutted`)

  for (const route of routes) {
    assert.ok(PAGE_TITLES[route], `${route} has no routeMetaMap entry, so it is not a page`)
    assert.ok(!RETIRED.has(route), `${route} is a retired URL answered with a 301`)
    assert.ok(!isSoonRoute(route), `${route} is still in the workshop — a Soon destination was linked`)
    assert.ok(!isPrivateRoute(route), `${route} is private or authenticated, so a signed-out visitor cannot follow it`)
  }
})

test('/principles is a real, indexable route with its own title and description', () => {
  assert.ok(PAGE_TITLES['/principles'], '/principles has no title, so it would ship the homepage title')
  assert.ok(PAGE_DESCRIPTIONS['/principles'], '/principles has no description')
  assert.ok(!isSoonRoute('/principles'))
  assert.ok(!isPrivateRoute('/principles'))
  // The title is what a browser tab, a bookmark and a share card carry. The old
  // /help title said "Help Centre" for a page that is no longer a centre.
  assert.match(PAGE_TITLES['/help'], /Getting Started/, '/help still advertises the retired page name')
})

/* ── the counts, against the registry that decides them ──────────────────── */

test('the tool counts on /help partition the registry exactly', () => {
  const all = CREATE_GROUPS.flatMap((g) => g.tools)
  assert.equal(
    LIVE_TOOLS.length + SOON_TOOLS.length, all.length,
    'a tool is either counted twice or dropped between the two figures /help prints',
  )
  assert.ok(LIVE_TOOLS.length > 0 && SOON_TOOLS.length > 0, 'one of the two figures is zero')

  // The rule, not the number: a tool inside a Soon GROUP is Soon whatever its
  // own flag says. That is the case the old prose inventory got wrong.
  for (const group of CREATE_GROUPS) {
    for (const tool of group.tools) {
      const live = LIVE_TOOLS.includes(tool)
      assert.equal(live, !group.soon && !tool.soon, `${tool.route} is counted on the wrong side`)
    }
  }
})

test('the "opens with something" claim has a real exception behind it', () => {
  // The heading on /help says N of these M already have something on screen.
  // Both figures are derived, so the only way the sentence becomes a lie is if
  // the exception disappears — which is what this asserts.
  assert.ok(STARTS_WITH_CONTENT > 0, 'no first move opens with anything')
  assert.ok(
    STARTS_WITH_CONTENT < HELP_STARTS.length,
    'every row now claims to open with content, so the sentence "the other one says so" is false',
  )
  assert.equal(
    HELP_STARTS.filter((s) => s.empty).length, HELP_STARTS.length - STARTS_WITH_CONTENT,
    'the derived count disagrees with the flags it is derived from',
  )
})

test('every answer that quotes a figure quotes one this repo owns', () => {
  const withNumbers = HELP_ANSWERS.filter((a) => /\d/.test(a.a))
  assert.ok(withNumbers.length >= 3, 'the answers have stopped quoting any figure at all')

  // The Soon answer states a count. It must be THE count, not a number.
  const soon = HELP_ANSWERS.find((a) => a.id === 'soon')
  assert.match(soon.a, new RegExp(`\\b${SOON_TOOLS.length}\\b`), 'the Soon answer quotes a stale count')

  // No answer may name an export format the panel cannot build. This is the
  // exportFormats.js contract applied to a second surface.
  const prose = HELP_ANSWERS.map((a) => a.a).join(' ') + HELP_STARTS.map((s) => s.body).join(' ')
  for (const format of unbuiltFormats()) {
    assert.ok(
      !prose.includes(format.name),
      `/help advertises "${format.name}", which carries no live flag and renders a disabled Soon button`,
    )
  }
})

/* ── the retired names must not come back ────────────────────────────────── */

test('no surface copy names a tool that was retired', () => {
  // The three the old page was still advertising on 2026-09-06. "Image
  // Converter" was renamed to File Converter, "Video to Frames" became a mode
  // inside it, and the reference guides have no route.
  const retiredNames = ['Video to Frames', 'Image Converter', 'Design Reference']
  const surfaces = {
    'src/data/helpStart.js': stripComments(read('src/data/helpStart.js')),
    'src/data/designPrinciples.js': stripComments(read('src/data/designPrinciples.js')),
    'src/pages/HelpCentre.jsx': stripComments(read('src/pages/HelpCentre.jsx')),
    'src/pages/DesignPrinciples.jsx': PRINCIPLES_PAGE,
  }
  for (const [file, src] of Object.entries(surfaces)) {
    for (const name of retiredNames) {
      assert.ok(!src.includes(name), `${file} names the retired tool "${name}"`)
    }
    // The claim that cost the most: it was false the day it was written.
    assert.ok(
      !/no third-party analytics/i.test(src),
      `${file} claims there are no third-party analytics trackers; src/main.jsx mounts @vercel/analytics`,
    )
  }
})

/* ── the register the founder chose ──────────────────────────────────────── */

test('neither surface writes in the first person or in marketing register', () => {
  // The same rule the Learn guides are held to: neutral and factual, not a
  // personal or marketing voice. Applied here because a
  // principles page is the surface most likely to drift into a manifesto.
  const firstPerson = /\b(?:we|we're|we've|our|ours|let's)\b/i
  const marketing = /\b(?:effortless|effortlessly|supercharge|unlock|unlocks|seamless|game-chang|revolutionar|delightful|best-in-class|world-class|at scale)\b/i

  const copy = [
    ...HELP_STARTS.map((s) => `${s.label} ${s.opensWith} ${s.body}`),
    ...HELP_ANSWERS.map((a) => `${a.q} ${a.a} ${a.linkLabel || ''}`),
    ...DESIGN_PRINCIPLES.map((p) => `${p.rule} ${p.body} ${p.linkLabel}`),
  ]
  assert.ok(copy.length >= 14, 'the copy tables have shrunk; this check would be near-vacuous')

  for (const line of copy) {
    const person = firstPerson.exec(line)
    assert.equal(person, null, `copy writes in the first person ("${person?.[0]}"): ${line}`)
    const sell = marketing.exec(line)
    assert.equal(sell, null, `copy reads as marketing ("${sell?.[0]}"): ${line}`)
  }
})

/* ── the principles, and the proofs beside them ──────────────────────────── */

test('every principle is wired to a proof the page can actually render', () => {
  assert.ok(DESIGN_PRINCIPLES.length >= 5, 'the principles table has been gutted')

  // Read the map out of the page rather than importing it: it holds React
  // components, which bare Node cannot evaluate. The ids are what matter, and a
  // rule added to the data module without a proof built for it must fail here
  // rather than render an empty row on the live page.
  const start = PRINCIPLES_PAGE.indexOf('const PROOFS = {')
  assert.notEqual(start, -1, 'DesignPrinciples.jsx no longer declares PROOFS')
  const block = PRINCIPLES_PAGE.slice(start, PRINCIPLES_PAGE.indexOf('\n}', start))

  for (const p of DESIGN_PRINCIPLES) {
    // The key is quoted only when the id contains a dash, so accept both forms.
    const wired = new RegExp(`(?:^|[{,\\s])['"]?${p.id}['"]?\\s*:`, 'm').test(block)
    assert.ok(wired, `the principle "${p.id}" has no proof component wired on the page`)
    assert.ok(p.rule.length > 0 && p.body.length > 0, `${p.id} has empty copy`)
    assert.ok(p.to && p.linkLabel, `${p.id} names no screen, so it is an unfalsifiable statement`)
  }
})

test('the principles page states rules, not the internal review vocabulary', () => {
  // .claude/skills/uil4b-brand-design/references/ is written for people working
  // ON this repository. Its words describe how to judge a surface, not what the
  // product believes about interfaces, and a public page borrowing them would
  // be talking to the wrong reader.
  const internal = /\b(?:slop|under-authored|overproduced|performative|anti-slop|agentic|agents?)\b/i
  for (const p of DESIGN_PRINCIPLES) {
    const found = internal.exec(`${p.rule} ${p.body}`)
    assert.equal(found, null, `${p.id} quotes internal review vocabulary: "${found?.[0]}"`)
  }
})

/* ── the four written-down hexes, read back out of the stylesheet ────────── */

/** The value of one custom property inside one theme block of global.css. */
function themeToken(theme, token) {
  const blocks = [...CSS.matchAll(new RegExp(`\\[data-theme="${theme}"\\]\\{([^}]*)\\}`, 'g'))]
  assert.ok(blocks.length > 0, `global.css has no [data-theme="${theme}"] block`)
  const hit = blocks[0][1].match(new RegExp(`${token}:(#[0-9A-Fa-f]{6})`))
  assert.ok(hit, `${theme} block does not set ${token}`)
  return hit[1].toUpperCase()
}

test('the hexes the proofs draw are still the product\'s own values', () => {
  // These four cannot be read out of the running document, because three of the
  // proofs are about BOTH themes at once and only one is ever mounted. This is
  // the check that makes writing them down safe.
  const expected = {
    LIGHT_GROUND: themeToken('light', '--bg-0'),
    DARK_GROUND: themeToken('dark', '--bg-0'),
    LIGHT_LINK: themeToken('light', '--link'),
    DARK_LINK: themeToken('dark', '--link'),
    // PINNED, not read: the proof's fill is the previous accent. The live
    // --accent (#2A60E8) clears 4.5:1 on the light page and cannot demonstrate
    // the boundary-only case, so Principle 1's proof is owed new copy.
    LIGHT_FILL: '#0F6FFF',
    LIGHT_INK: themeToken('light', '--t0'),
  }
  for (const [name, value] of Object.entries(expected)) {
    const declared = PROOFS_SRC.match(new RegExp(`const ${name} = '(#[0-9A-Fa-f]{6})'`))
    assert.ok(declared, `SystemProofs.jsx no longer declares ${name}`)
    assert.equal(
      declared[1].toUpperCase(), value,
      `${name} in SystemProofs.jsx has drifted from the stylesheet`,
    )
  }
})

test('the contrast proof still demonstrates the split it claims', () => {
  const ground = themeToken('light', '--bg-0')
  const link = contrastRatio(themeToken('light', '--link'), ground)
  const fill = contrastRatio('#0F6FFF', ground)

  // The whole argument of the first principle: one of these two is text-safe
  // and one is not. If the palette ever moves so both pass, or both fail, the
  // page is still true but the proof no longer shows anything and must be
  // rewritten rather than left standing.
  assert.ok(link >= 4.5, `--accent-strong is ${link.toFixed(2)}:1 and no longer clears the text floor`)
  assert.ok(fill < 4.5, `--accent is ${fill.toFixed(2)}:1 and now clears the text floor, so the proof shows nothing`)
  assert.ok(fill >= 3, `--accent is ${fill.toFixed(2)}:1 and no longer clears the boundary floor either`)
})

/* ── the ramp on /help is the ramp the Colour Studio generates ───────────── */

test('the tint config /help renders is the one ColorStudio builds', () => {
  const cfg = tintConfigFor(DEFAULT_DESIGN)
  // Read the studio's own memo back out of source. The strip's caption says the
  // ramp is what a new project starts with; if the studio's configuration and
  // this helper ever diverge, that sentence becomes false silently.
  const studio = stripComments(read('src/pages/ColorStudio.jsx'))
  const start = studio.indexOf('generateTintScale({')
  assert.notEqual(start, -1, 'ColorStudio.jsx no longer calls generateTintScale')
  const call = studio.slice(start, studio.indexOf('})', start))

  assert.match(call, /anchor:\s*5/, 'the studio no longer anchors the base at the 500 stop')
  assert.match(call, /hueShift:\s*0/, 'the studio now drifts the hue')
  assert.match(call, /mode:\s*'perceived'/, 'the studio no longer uses the perceived curve')
  assert.match(call, /satMin:\s*-satDecay/, 'the studio derives satMin differently now')
  assert.match(call, /satMax:\s*satDecay\s*\/\s*2/, 'the studio derives satMax differently now')
  assert.match(call, /lMin:\s*oled\s*\?\s*3\s*:\s*5/, 'the studio derives lMin differently now')
  assert.match(call, /lMax:\s*lumBias/, 'the studio derives lMax differently now')

  assert.equal(cfg.anchor, 5)
  assert.equal(cfg.hueShift, 0)
  assert.equal(cfg.mode, 'perceived')
  assert.equal(cfg.hex, DEFAULT_DESIGN.palette.base)
  assert.equal(cfg.satMin, -DEFAULT_DESIGN.tints.satDecay)
  assert.equal(cfg.satMax, DEFAULT_DESIGN.tints.satDecay / 2)
  assert.equal(cfg.lMin, DEFAULT_DESIGN.tints.oled ? 3 : 5)
  assert.equal(cfg.lMax, DEFAULT_DESIGN.tints.lumBias)

  const ramp = generateTintScale(cfg)
  assert.equal(ramp.length, T_LABELS.length, 'the strip would render a ramp of the wrong length')
  assert.ok(ramp.every((hex) => /^#[0-9a-f]{6}$/i.test(hex)), 'the ramp produced something that is not a hex')
})

test('the files the strip names are files the export panel can build', () => {
  const free = freeFormats()
  assert.ok(free.length > 0, 'the strip would name no files at all')
  for (const format of free) {
    assert.equal(format.live, true, `${format.id} is named as an output but is not built`)
    assert.notEqual(format.pro, true, `${format.id} is named as free but is gated`)
  }
  // The three columns of the export proof must account for every format, or the
  // caption's "all N formats" is wrong.
  assert.equal(
    free.length + proOnlyFormats().length + unbuiltFormats().length,
    EXPORT_FORMATS.length,
    'the export proof drops or double-counts a format',
  )
})

test('the type ladder is the arithmetic the caption states', () => {
  const { base, ratio } = DEFAULT_DESIGN.typeScale
  assert.ok(base > 0 && ratio > 1, 'the default scale is degenerate, so the ladder shows nothing')
  for (const exp of [3, 2, 1, 0, -1]) {
    assert.equal(
      stepPx(base, ratio, exp, 'half'),
      Math.round(base * Math.pow(ratio, exp) * 2) / 2,
      `step ${exp} is not base x ratio^step`,
    )
  }
  assert.equal(stepPx(base, ratio, 0, 'half'), base, 'the base step is not the base size')
})

/* ── the stylesheet the two pages depend on ──────────────────────────────── */

test('global.css defines the classes both pages render', () => {
  assert.equal(
    (CSS.match(/\{/g) || []).length, (CSS.match(/\}/g) || []).length,
    'global.css braces are unbalanced',
  )
  for (const cls of ['.hlp-run', '.hlp-starts', '.hlp-answers', '.prn-list', '.prn-item', '.prn-cx-rows', '.prn-th-grid', '.prn-ty-rows', '.prn-ex-cols', '.prn-sn-figures']) {
    assert.ok(CSS.includes(`${cls}{`) || CSS.includes(`${cls},`) || CSS.includes(`${cls} `),
      `${cls} is rendered but has no rule`)
  }
})
