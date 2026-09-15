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
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../../src/data/routeMetaMap.js'
import { CREATE_GROUPS, DISCOVER_GROUPS, LEARN_GROUPS } from '../../src/data/toolTree.js'
import { LEGACY_REDIRECTS } from '../../src/data/legacyRoutes.js'
import { NEXT_TODO } from '../../src/data/pipeline.js'
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

/* ── guides: /info may only name a guide that is published ─────────────────── */

test('/info reads its guide list from the registry rather than typing it', () => {
  // The typed sentence named five topics; three were roadmap rows. The fix is
  // not a corrected list — it is no list at all in this file, so a guide
  // cannot be named here without existing in learnIndex.js.
  assert.ok(INFO.includes('LEARN_ARTICLES.map('),
    'InfoCentre.jsx no longer renders its guides from LEARN_ARTICLES, so it is free to name one that does not exist')
  assert.ok(/TOPICS\b/.test(INFO),
    'InfoCentre.jsx no longer derives its topic list from TOPICS in learnIndex.js')

  // The roadmap rows it used to advertise as guides. Read the flag: when a
  // row ships and flips to soon:false, its name is allowed back.
  const roadmap = LEARN_GROUPS.filter((g) => g.soon)
  assert.ok(roadmap.length >= 1, 'nothing on the Learn roadmap is Soon; retire this check')
  const typed = /Reference guides on design principles|SEO, and marketing/
  assert.ok(!typed.test(INFO),
    '/info types a guide list again, and it named SEO and marketing — LEARN_GROUPS still has them soon:true')
})

test('/info links to no retired URL and to nothing without a title', () => {
  const retired = new Set(LEGACY_REDIRECTS.map(([from]) => from))
  const links = [...INFO.matchAll(/to="(\/[^"]*)"/g)].map((m) => m[1].split('#')[0])
  // POSITIVE CONTROL: the page links out to Settings and Projects at least.
  assert.ok(links.length >= 3, `only ${links.length} literal links found on /info — the extractor is broken`)
  for (const route of links) {
    assert.ok(!retired.has(route),
      `/info links to ${route}, which legacyRoutes.js answers with a 301 — it used to send readers to /resources, which lands on /discover, not the resources page`)
    assert.ok(PAGE_TITLES[route],
      `/info links to ${route}, which has no routeMetaMap entry, so it is not a page`)
  }
})

/* ── Settings: every "Settings → X" on /info must be a tab or heading X has ── */

test('every Settings destination /info names exists under that name in Settings.jsx', () => {
  const settings = stripComments(read('src/pages/Settings.jsx'))
  const named = [...INFO.matchAll(/Settings → ([^<]+)<\/Link>/g)].map((m) => m[1].trim())
  // POSITIVE CONTROL: the page sends readers into Settings at least three
  // times (Account, Subscription, Your data).
  assert.ok(named.length >= 3, `only ${named.length} "Settings → …" instructions found on /info`)
  for (const name of named) {
    // A tab is `label: 'X'` (or `|| 'X'` behind an i18n key); a section is
    // an <h2>X</h2>. Either satisfies the instruction.
    const asTab = settings.includes(`'${name}'`)
    const asHeading = settings.includes(`>${name}<`)
    assert.ok(asTab || asHeading,
      `/info sends the visitor to "Settings → ${name}", and Settings.jsx has no tab labelled `
      + `'${name}' and no <h2>${name}</h2>. It said "Support" for the tab labelled Subscription.`)
  }
})

test('/info does not promise a Pro preview or a cancellation the product does not have', () => {
  assert.ok(INFO.includes('Pro unlocks'), 'the Free vs Pro sentence is gone; this check is reading nothing')
  assert.ok(!/advanced previews/i.test(INFO),
    '/info says Pro unlocks "advanced previews" again. Nothing gates a preview on Pro — see the '
    + 'Pro deltas Plans.jsx derives — and the phrase names a feature that does not exist.')

  // The cancellation flow is an owner action in the Stripe dashboard, tracked
  // as a pipeline row. While it is not done, the portal the Cancel plan button
  // opens has nothing to cancel in it, and /plans deleted "cancel any time"
  // on exactly that basis. Read the row so finishing it retires this.
  const row = NEXT_TODO.find((t) => t.id === 'stripe-retention-config')
  if (row && row.status !== 'done') {
    assert.ok(!/\bcancel\b/i.test(INFO),
      `/info tells the visitor they can cancel from Settings, and pipeline.js still has `
      + `stripe-retention-config at '${row.status}' — the portal has no cancellation flow. `
      + 'Finish the owner action (or mark the row done) before the sentence comes back.')
  }
})

/* ── privacy: no "runs client-side" while a tool posts the work to /api/ai ── */

test('/info makes no client-side promise while the AI tools send work to the server', () => {
  const altText = stripComments(read('src/pages/AltTextGenerator.jsx'))
  // POSITIVE CONTROL, and the condition: the promise is only false while a
  // tool actually ships the visitor's input off the device. Read the call.
  const postsImage = altText.includes("fetch('/api/ai'") && /\bimage:\s*item\.base64/.test(altText)
  assert.ok(postsImage,
    'AltTextGenerator.jsx no longer posts the image to /api/ai — either the tool moved in-browser '
    + '(then delete this test) or the request changed shape and this check is reading the wrong line')

  for (const phrase of ['runs client-side', 'never leaves your device']) {
    assert.ok(!INFO.includes(phrase),
      `/info says "${phrase}" again, and AltTextGenerator.jsx posts the image itself to /api/ai. `
      + 'A privacy assurance that is false for the AI tools is the one sentence this page must not approximate.')
  }
})

/* ── the Preview instruction points at the page that has the control ─────── */

test('the /info Preview link goes to the tool that has a Preview control', () => {
  const builder = stripComments(read('src/pages/PaletteBuilder.jsx'))
  const landing = stripComments(read('src/pages/ColorLanding.jsx'))
  // The control is real, and it is not on the page the link used to name —
  // both halves, so the assertion below is about something.
  assert.ok(builder.includes('aria-label="Preview"'), 'PaletteBuilder.jsx has lost its Preview control')
  assert.ok(!landing.includes('aria-label="Preview"'),
    'ColorLanding.jsx now has a Preview control, so the old link target was not wrong; revisit this test')

  const link = INFO.match(/<Link to=(\{[^}]+\}|"[^"]+")>Preview<\/Link>/)
  assert.ok(link, '/info no longer renders a Preview link')
  assert.equal(link[1], "{toolRoute('palette')}",
    `/info's Preview link points at ${link[1]}; the Preview control is PaletteBuilder's, and the route `
    + 'is read from the tool tree so it cannot name a page the control is not on')
})

/* ── the export gate: sign-in is no longer "only" for saving ───────────────── */

test('/info stops calling sign-in optional while taking a file away needs an account', () => {
  const panel = stripComments(read('src/components/ExportPanel.jsx'))
  // Condition and positive control in one: the gate exists and the panel
  // uses it (e2309608). Remove the gate and the old wording is true again,
  // and this check should go with it.
  assert.ok(panel.includes('useExportGate'),
    'ExportPanel.jsx no longer uses useExportGate — file exports are ungated again, so retire this test')
  for (const phrase of ['only if you want saved projects', 'is optional']) {
    assert.ok(!INFO.includes(phrase),
      `/info says sign-in "${phrase}" again, and taking a file away — the export panel, the icon `
      + 'SVG, the converter downloads, the palette PNG — now needs a free account (useExportGate.js).')
  }
})

/* ── /sitemap: its ledes name only what is live ─────────────────────────────── */

test('/sitemap does not promise a Soon group in its Create lede or type a Discover blurb', () => {
  const map = stripComments(read('src/pages/SiteMap.jsx'))
  const lede = map.match(/<h2 id="smap-create">Create<\/h2>\s*(?:\{\}\s*)?<p>([^<]+)<\/p>/)
  assert.ok(lede && /colour/.test(lede[1]), 'the Create lede on /sitemap is gone or has changed shape')
  if (CREATE_GROUPS.some((g) => g.id === 'component' && g.soon)) {
    assert.ok(!/\bcomponents\b/i.test(lede[1]),
      `/sitemap's Create lede says "${lede[1].trim()}" — "components" while the component group is `
      + 'soon:true, under a header that promises the map "only ever promises what\'s actually live"')
  }
  // The Discover column may not carry a TYPED description while any of its
  // groups is Soon. The one it had read "Community systems, fonts, prompts and
  // curated resources." with Inspiration — the community half — soon:true.
  // Scoped to that column on purpose: the Learn column's typed lede names the
  // roadmap honestly ("plus the topics still to be written") and is not the
  // defect. Rows inside the column render `{g.desc}` from the registry, which
  // is the positive control that the block was found.
  const start = map.indexOf('data-sitemap-section="discover"')
  const end = map.indexOf('data-sitemap-section="learn"')
  assert.ok(start !== -1 && end > start, '/sitemap no longer marks its Discover and Learn columns; the extractor is blind')
  const discover = map.slice(start, end)
  assert.ok(discover.includes('note={g.desc}'), "the Discover column no longer renders each group's desc from the registry")
  if (DISCOVER_GROUPS.some((g) => g.soon)) {
    const typed = discover.match(/<p className="smap-cat-desc">[^{<][^<]*/)
    assert.equal(typed, null,
      `/sitemap types a Discover description again (${typed?.[0]}) while a Discover group is still Soon; `
      + "the rows beneath already carry each group's own desc from toolTree.js")
  }
})

test('the superlative deleted from /discover is not on /info', () => {
  // "the best" was removed from '/discover' and '/discover/gradients' by
  // name (routeMetaMap.js). /info carried it for the same page.
  assert.ok(INFO.length > 5000 && INFO.includes('Reference guides on'),
    'InfoCentre.jsx has changed shape; this check may be reading the wrong file')
  assert.ok(!/\bthe best\b/i.test(INFO),
    'InfoCentre.jsx says "the best" again — the quality superlative the /discover description deleted by name')
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
