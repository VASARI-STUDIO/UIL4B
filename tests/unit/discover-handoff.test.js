// The Discover hand-off — "every curated resource opens in the real tool" — is
// the spine of the surface, and the thing that silently breaks it is a CTA
// pointing at a tool that has not shipped. CreateTool.jsx resolves
// `group.soon ? null : LIVE_TOOLS[path]`, so a `soon` route renders
// <ComingSoon/> for everyone: the button looks live, and lands on a placeholder.
//
// GATED_ROUTES used to be a hand-kept literal, `new Set(['/create/component-
// designer', '/create/file-converter'])`, and it had drifted in BOTH directions
// by the time /discover/resources was built:
//
//   • /create/file-converter SHIPPED (soon:false, mounted in LIVE_TOOLS) and was
//     still listed as gated, so coverr, unsplash and transform-tools silently
//     lost the hand-off they were curated to have.
//   • /create/box-shadow is soon:true and was NEVER listed, so cssscan-shadows
//     and cubic-bezier offered a button that dead-ends — the exact fault the set
//     exists to prevent.
//
// Its own comment had promised that removing a route "when the tool ships
// re-lights every CTA for it automatically". Nobody ever did. So the set is now
// DERIVED from toolTree's own `soon` flags, and these tests hold it there.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

import { GATED_ROUTES, primaryAvailableTool, isToolAvailable, buildToolHandoffUrl } from '../../src/components/discover/discoverUtils.js'
import { DISCOVER_RESOURCES } from '../../src/data/discoverResources.js'
import { createTools, liveToolRoutes, DISCOVER_GROUPS } from '../../src/data/toolTree.js'

const page = (p) => readFile(new URL(p, import.meta.url), 'utf8')

test('GATED_ROUTES is exactly the set of Create tools that are still `soon`', () => {
  const soon = createTools().filter(t => t.soon).map(t => t.route).sort()
  assert.deepEqual([...GATED_ROUTES].sort(), soon,
    'GATED_ROUTES has drifted from toolTree. It must be derived, never typed.')
})

test('no route that mounts a real screen is treated as gated', () => {
  const live = liveToolRoutes()
  const wrongly = live.filter(r => GATED_ROUTES.has(r))
  assert.deepEqual(wrongly, [],
    `these tools have shipped but their hand-off is still suppressed: ${wrongly.join(', ')}`)
})

test('the two routes that had actually drifted are now classified correctly', () => {
  // Named explicitly, because both were wrong for months and neither was visible
  // in a diff: one silently removed a CTA, the other silently pointed one at a
  // placeholder.
  assert.ok(!GATED_ROUTES.has('/create/file-converter'),
    '/create/file-converter shipped (soon:false, mounted) — its hand-off must be live')
  assert.ok(GATED_ROUTES.has('/create/box-shadow'),
    '/create/box-shadow is soon:true and renders <ComingSoon/> — it must never be offered')
})

test('/create/color stays available even though the Create tree does not own it', () => {
  // App.jsx intercepts /create/color above CreateTool and renders ColorLanding,
  // so it is a real page and is absent from createTools(). A derivation that
  // gated "anything not in liveToolRoutes()" would wrongly kill the hand-off on
  // all four palette + undraw resources.
  assert.ok(isToolAvailable({ route: '/create/color' }))
  const viaColor = DISCOVER_RESOURCES.filter(r => primaryAvailableTool(r)?.route === '/create/color')
  assert.ok(viaColor.length >= 4, `expected the palette resources to hand off to /create/color, got ${viaColor.length}`)
})

test('no curated resource offers a hand-off to a tool that has not shipped', () => {
  const bad = []
  for (const r of DISCOVER_RESOURCES) {
    const tool = primaryAvailableTool(r)
    if (tool && GATED_ROUTES.has(tool.route)) bad.push(`${r.id} -> ${tool.route}`)
  }
  assert.deepEqual(bad, [],
    `these resources would render a CTA landing on Coming Soon:\n  ${bad.join('\n  ')}`)
})

test('every relatedTools route names a destination the app can actually render', () => {
  // A curated record is hand-written, so a typo'd route is a real risk and would
  // send a reader to the 404 page rather than to a tool.
  const known = new Set([...createTools().map(t => t.route), '/create/color'])
  const bad = []
  for (const r of DISCOVER_RESOURCES) {
    for (const t of r.relatedTools || []) {
      if (!known.has(t.route)) bad.push(`${r.id} -> ${t.route}`)
    }
  }
  assert.deepEqual(bad, [], `unknown hand-off destinations:\n  ${bad.join('\n  ')}`)
})

test('the hand-off URL carries the preset only when the record supplies one', () => {
  assert.equal(buildToolHandoffUrl({ route: '/create/color' }), '/create/color')
  assert.equal(
    buildToolHandoffUrl({ route: '/create/gradient', preset: 'sunset', tab: 'gradient' }),
    '/create/gradient?preset=sunset&tab=gradient')
})

test('the nav no longer advertises Curated Resources as Soon', () => {
  // The entry existed, said "Soon" and pointed at /discover for months while the
  // 22 resources sat unrendered. A regression here re-hides a live page.
  const curated = DISCOVER_GROUPS.find(g => g.id === 'curated')
  assert.ok(curated, 'the curated nav entry is gone')
  assert.equal(curated.soon, false)
  assert.equal(curated.route, '/discover/resources')
})

test('every external link on the Curated Resources page carries the full rel', async () => {
  // Curated URLs are third-party. noopener/noreferrer closes the opener channel;
  // nofollow is the convention this app already applies to curated and
  // member-submitted outbound links (AppFooter, CommunityCard).
  const src = await page('../../src/pages/CuratedResources.jsx')
  const anchors = src.match(/<a\b[\s\S]*?>/g) || []
  assert.ok(anchors.length > 0, 'expected at least one raw anchor')
  for (const a of anchors) {
    assert.match(a, /rel="noopener noreferrer nofollow"/, `an external anchor is missing the rel convention:\n${a}`)
    assert.match(a, /target="_blank"/, `an external anchor is missing target=_blank:\n${a}`)
  }
})

// Strip comments before scanning for banned words. THIS IS NOT FUSSINESS: the
// first version of the test below failed on this very file's own design note
// ("no save counts ... printing \"0 saves\" on every card"), which is the same
// defect class the repo already carries a scar from — design-tokens.test.js
// scanning global.css without stripping comments read a var() inside a design
// note as a real usage and failed the build.
//
// Block comments are removed first, then line comments, and a `//` is only
// treated as a comment when it is not preceded by `:` so a `https://` inside a
// string literal survives. A mutation control below proves the stripped scan
// still catches a real occurrence in code.
const stripComments = (src) => src
  .replace(/\/\*[\s\S]*?\*\//g, ' ')
  .replace(/(^|[^:])\/\/[^\n]*/g, '$1')

test('the page never fetches an external URL and never prints an invented metric', async () => {
  const src = stripComments(await page('../../src/pages/CuratedResources.jsx'))
  // No network: a curated URL is user/curator-supplied, so fetching it server- or
  // client-side would be an SSRF / privacy surface. The page renders text only.
  assert.ok(!/\bfetch\s*\(/.test(src), 'the page must never fetch a curated external URL')
  assert.ok(!/<img\b/.test(src), 'the page must never hotlink a third-party image')
  // No zeroes dressed as engagement. There are no users yet, so a save/view/
  // trending count would be invented — the homepage strip was just fixed for
  // printing "0 saves" on every card.
  for (const word of ['saves', 'views', 'likes', 'trending', 'Most saved']) {
    assert.ok(!new RegExp(`\\b${word}\\b`, 'i').test(src),
      `"${word}" implies a count nothing sources yet`)
  }
})

test('the invented-metric scan still fires on a real occurrence in code', () => {
  // The control for stripComments: prove the guard above is still capable of
  // failing. Without this, deleting every banned word from the regex would
  // look identical to a clean page.
  const withComment = stripComments('// we deliberately show no saves here\nconst a = 1')
  assert.ok(!/saves/i.test(withComment), 'a comment must not trip the scan')

  const inCode = stripComments('const label = "12 saves"\n// nothing to see')
  assert.ok(/saves/i.test(inCode), 'a real string in code MUST still trip the scan')

  const urlKept = stripComments('const u = "https://example.com/saves"')
  assert.ok(/saves/i.test(urlKept), 'a // inside a URL must not eat the rest of the line')
})
