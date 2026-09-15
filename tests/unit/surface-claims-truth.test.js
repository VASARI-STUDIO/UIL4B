// A PAGE MAY NOT DESCRIBE A THING THE CODE DOES NOT DO.
//
// This is the sweep behind tests/unit/documented-shortcuts.test.js, widened
// from keyboard shortcuts to every other shape a stale sentence takes: an
// export the panel cannot build, a tool group that is still Soon, a guide that
// is a roadmap row, a Settings tab under a name it does not have, a submission
// that "appears" on a site with no code to show it. Measured 2026-09-15 across
// /info, /sitemap, /community, /plans and routeMetaMap.js, each one was live.
//
// The shape is the one the repo already uses for plans.js, DESIGN.md and the
// shortcuts: read the sentence back out of the surface, read the fact out of
// the module that decides it, and fail when they disagree. Where the fact can
// change — a format going live, a tool group shipping — the assertion reads
// the flag, so shipping the feature retires the check instead of breaking it.
//
// WHAT THIS CANNOT DO: judge a sentence that is merely vague. "Everything you
// need to know" is puffery, not a claim, and nothing here tries to score it.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { assertStripperWorks, read, stripComments } from './helpers/source-text.js'
import { EXPORT_FORMATS, unbuiltFormats } from '../../src/config/exportFormats.js'
import { PAGE_DESCRIPTIONS } from '../../src/data/routeMetaMap.js'
import { CREATE_GROUPS } from '../../src/data/toolTree.js'
import { isSoonRoute } from '../../src/utils/routeMeta.js'

// Comments here quote the sentences they explain — every deletion below is
// documented beside the place it happened — so an unstripped read would find
// the explanation and pass on a page that had put the sentence back.
const INFO = stripComments(read('src/pages/InfoCentre.jsx'))

test('the stripper still works, so every source read below can be trusted', () => {
  assertStripperWorks(assert)
})

/* ── exports: the verb "export" may not be followed by a format that is Soon ── */

// The word a description uses for each unbuilt format. `assets` ("SVG + PNG")
// is deliberately absent: the icon library really does hand over SVG, so "SVG"
// after "export" is not always the asset bundle. That case is pinned by name
// on the two surfaces that made it, below.
const FORMAT_WORD = { css: 'CSS', tailwind: 'Tailwind', json: 'JSON' }

// "export" then, inside the same sentence, the format. "Copy CSS" is not
// caught, on purpose: the tools have per-tool Copy buttons and index.html
// already words that honestly. It is the PANEL export that is Soon.
const exportOf = (word) => new RegExp(`\\bexport(?:s|ed|ing)?\\b[^.]*\\b${word}\\b`, 'i')

test('the export regex catches the sentence that shipped, so the sweep below is not vacuous', () => {
  const shipped = 'Build professional colour systems with palette generation, tint scales, gradient builder, and named colour libraries. Export CSS, Tailwind, PNG and SVG.'
  assert.match(shipped, exportOf('CSS'))
  assert.match(shipped, exportOf('Tailwind'))
  // And the sentence /create/type-scale is allowed to keep: "copy", not "export".
  assert.doesNotMatch(PAGE_DESCRIPTIONS['/create/type-scale'], exportOf('Tailwind'))
  assert.match(PAGE_DESCRIPTIONS['/create/type-scale'], /Tailwind/, 'the control sentence has lost the word it controls for')
})

test('no served description sells an export the panel marks Soon', () => {
  const unbuilt = unbuiltFormats().filter((f) => FORMAT_WORD[f.id])
  // POSITIVE CONTROL. If every format goes live this test has nothing to say,
  // which is correct — but it must say so rather than pass silently.
  assert.ok(unbuilt.length >= 1,
    'every named format is live, so this sweep guards nothing; delete it with the commit that built them')

  const served = Object.entries(PAGE_DESCRIPTIONS).filter(([route]) => !isSoonRoute(route))
  assert.ok(served.length >= 30, `only ${served.length} served routes — the table has been gutted`)

  for (const [route, desc] of served) {
    for (const f of unbuilt) {
      assert.doesNotMatch(desc, exportOf(FORMAT_WORD[f.id]),
        `${route} tells a crawler it exports ${FORMAT_WORD[f.id]}, and exportFormats.js has `
        + `\`${f.id}\` with no live flag — a Soon badge over a disabled button. Either the `
        + 'format shipped and the flag is stale, or the clause goes, as it did for /create/color.')
    }
  }
})

test('/info does not tell the visitor to export a format the panel cannot build', () => {
  const unbuilt = unbuiltFormats().filter((f) => FORMAT_WORD[f.id])
  assert.ok(unbuilt.length >= 1, 'nothing is Soon; retire this with the commit that built the formats')
  // assert.ok rather than doesNotMatch: on failure the latter prints the
  // whole page source as `actual`, which buries the one line that matters.
  for (const f of unbuilt) {
    assert.ok(!exportOf(FORMAT_WORD[f.id]).test(INFO),
      `InfoCentre.jsx tells the visitor to export ${FORMAT_WORD[f.id]} again, and `
      + `exportFormats.js still has \`${f.id}\` without a live flag.`)
  }
})

/* ── tool groups: a Soon group is not a tool /info can explain ─────────────── */

test('/info describes no Create group that is still Soon', () => {
  const soonGroups = CREATE_GROUPS.filter((g) => g.soon)
  // POSITIVE CONTROL. Every group live means nothing to guard — say so.
  assert.ok(soonGroups.length >= 1,
    'no Create group is Soon any more; delete this test with the commit that shipped the last one')

  // The section that was there on 2026-09-15: "UI Builder — Design dashboard
  // components … craft layered CSS box-shadows. Export production-ready CSS in
  // a click." for a group whose two tools both carry soon:true. Read the flag,
  // so shipping the group retires the check instead of breaking it.
  if (soonGroups.some((g) => g.id === 'component')) {
    for (const phrase of ["title: 'UI Builder'", 'Design dashboard components', 'CSS box-shadows']) {
      assert.ok(!INFO.includes(phrase),
        `InfoCentre.jsx carries "${phrase}" again, and the component group in toolTree.js is `
        + 'still soon:true — the nav, the site map and llms.txt all say the tool does not open.')
    }
  }
  // And no Soon tool's own label may head a section, whichever group it is in.
  for (const g of soonGroups) {
    for (const tool of g.tools) {
      assert.ok(!INFO.includes(`title: '${tool.label}'`),
        `/info has a section titled "${tool.label}", a tool toolTree.js marks Soon`)
    }
  }
})

test('the export clauses deleted on 2026-09-15 are not quietly back', () => {
  // '/create/color' ended "Export CSS, Tailwind, PNG and SVG." — three of the
  // four not live. Pinned by the two words the regex above cannot own.
  const colour = PAGE_DESCRIPTIONS['/create/color']
  assert.ok(colour && /colour systems/.test(colour), '/create/color has lost its description entirely')
  const assets = EXPORT_FORMATS.find((f) => f.id === 'assets')
  if (assets && !assets.live) {
    assert.ok(!/\bSVG\b/.test(colour),
      '/create/color promises an SVG export again; the only SVG the panel lists is the asset bundle, which is not live')
  }
  assert.ok(!/export to CSS/i.test(INFO),
    'InfoCentre.jsx says "export to CSS" again — that clause was deleted because the CSS export is Soon')
})
