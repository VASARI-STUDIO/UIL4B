// public/llms.txt MUST BE WHAT THE GENERATOR WRITES, AND EVERY NUMBER IN IT
// MUST BE AN ENFORCED ONE.
//
// ─────────────────────────────────────────────────────────────────────────────
// WHY THIS FILE, OF ALL FILES
// ─────────────────────────────────────────────────────────────────────────────
// llms.txt is read by a machine deciding what this product is, and a machine
// does not notice a claim going stale. docs/reference/doc-authority-map.md
// records four faults found in it on 2026-09-06 and closes with "a guard tying
// llms.txt's price to planLadder.js is the durable fix". No guard was written.
// By 2026-09-08 it had drifted again — the Brand Starter missing from the tool
// list while its old name sat under "not yet built", "Five published guides"
// against seven, and a summary selling CSS and design-token exports that
// src/config/exportFormats.js has never marked live.
//
// The fix is the one this repository applies to every other typed claim: the
// file is DERIVED (scripts/llms-txt.mjs), the committed copy is asserted equal
// to the derivation, and the numbers in the sentences the generator composes
// itself are held to the modules the server enforces.
//
// Two directions, as with stripe-product-truth.test.js:
//   · the committed file must be the generator's output, byte for byte after
//     line-ending normalisation (the sitemap rule — CRLF checkout on Windows);
//   · every figure the generator composes must be the enforced figure, so a
//     generator that typed "6" instead of reading AI_LIMITS.free.daily fails
//     here even though the committed file would agree with it.
//
// And the wiring: prerender.mjs must write the served copy from the same
// function, or a stale commit ships while the unit suite stays green.
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments, assertStripperWorks } from './helpers/source-text.js'
import { buildLlmsTxt, llmsClaims, llmsRoutes } from '../../scripts/llms-txt.mjs'
import { pricingSentence } from '../../scripts/site-pricing.mjs'
import { prerenderRoutes } from '../../scripts/route-matrix.mjs'
import { SURFACE_LINE, line } from '../../src/data/positioning.js'
import { AI_LIMITS } from '../../src/config/plans.js'
import { PLANS, dailyLimitFor, monthlyLimitFor } from '../../api/_lib/plans.js'
import {
  FREE_TOTAL_GENERATIONS as SERVER_FREE_STARTER,
  PRO_MONTHLY_GENERATIONS as SERVER_PRO_STARTER,
} from '../../api/_lib/aiGeneration.js'
import { GENERATION_ALLOWANCES } from '../../src/config/aiGeneration.js'
import { EXPORT_FORMATS, freeFormats, proOnlyFormats, unbuiltFormats } from '../../src/config/exportFormats.js'
import { cheapestPerMonth, resolvePlanLadder } from '../../src/config/planLadder.js'
import { createTools } from '../../src/data/toolTree.js'
import { LEARN_ARTICLES } from '../../src/data/learnIndex.js'
import { PAGE_DESCRIPTIONS } from '../../src/data/routeMetaMap.js'

const eol = (s) => s.replace(/\r\n/g, '\n')
const COMMITTED = eol(read('public/llms.txt'))

test('the comment stripper works, so the wiring assertions below mean something', () => {
  assertStripperWorks(assert)
})

// ─────────────────────────────────────────────────────────────────────────────
// 1 · The committed file IS the generator's output
// ─────────────────────────────────────────────────────────────────────────────
test('public/llms.txt is exactly what scripts/llms-txt.mjs writes — no hand-edit drift', () => {
  assert.equal(COMMITTED, eol(buildLlmsTxt()),
    'run `npm run sync:llms` — public/llms.txt has drifted from the generator')
})

test('the generator is not vacuous: it lists real tools, real guides and real pages', () => {
  // Positive control. An equality test passes for two empty strings.
  const { tools, learn, browse, more, soon } = llmsRoutes()
  assert.ok(tools.length >= 10, `only ${tools.length} tools listed`)
  assert.equal(learn.length, LEARN_ARTICLES.length, 'the Learn section does not list every published guide')
  assert.ok(browse.length >= 3 && more.length >= 4)
  assert.ok(soon.length >= 1, 'nothing is Soon any more — the Optional section has stopped discriminating')
  assert.ok(COMMITTED.length > 2000, 'the committed file is implausibly short')
})

// ─────────────────────────────────────────────────────────────────────────────
// 2 · The summary is the founder's line, by the id the module assigns
// ─────────────────────────────────────────────────────────────────────────────
test('the summary opens on line(SURFACE_LINE.llmsSummary), verbatim', () => {
  const founder = line(SURFACE_LINE.llmsSummary)
  assert.ok(COMMITTED.startsWith(`# UIL4B\n\n> ${founder} `),
    'llms.txt does not open on the founder line positioning.js assigns to it')
  // …and the pricing sentence is the ONE index.html's <noscript> prints, so a
  // crawler reading the two cannot be told two different numbers.
  assert.ok(COMMITTED.includes(pricingSentence()),
    'llms.txt no longer carries the same derived pricing sentence as index.html')
})

// ─────────────────────────────────────────────────────────────────────────────
// 3 · Every number the generator composes is an enforced number
// ─────────────────────────────────────────────────────────────────────────────
test('every figure in the composed claims is the figure the server enforces', () => {
  const daily = { free: dailyLimitFor(PLANS.free, 'ai-default'), pro: dailyLimitFor(PLANS.pro, 'ai-default') }
  const monthly = { free: monthlyLimitFor(PLANS.free, 'ai-default'), pro: monthlyLimitFor(PLANS.pro, 'ai-default') }
  // The mirror the generator reads must BE the server's number, or the guard
  // below is checking a copy against itself.
  assert.deepEqual(AI_LIMITS, { free: { daily: daily.free, monthly: monthly.free }, pro: { daily: daily.pro, monthly: monthly.pro } })
  assert.equal(GENERATION_ALLOWANCES.free.total, SERVER_FREE_STARTER)
  assert.equal(GENERATION_ALLOWANCES.pro.total, SERVER_PRO_STARTER)

  const lead = cheapestPerMonth(resolvePlanLadder())
  assert.ok(lead, 'no purchasable tier — the price claim has nothing to derive from')
  const enforced = new Set([
    daily.free, monthly.free, daily.pro, monthly.pro,
    SERVER_FREE_STARTER, SERVER_PRO_STARTER,
    lead.perMonth,
  ].map(String))

  const claims = llmsClaims()
  // The summary and the two plan lines are the ones whose whole content is a
  // number; notBuilt names formats and legitimately carries none.
  const mustCarryNumbers = ['summary', 'freePlan', 'proPlan']
  for (const [key, sentence] of Object.entries(claims)) {
    const numbers = sentence.match(/\d+(?:\.\d+)?/g) || []
    if (mustCarryNumbers.includes(key)) {
      assert.ok(numbers.length > 0, `the ${key} claim carries no number at all — it has stopped saying anything checkable`)
    }
    for (const n of numbers) {
      assert.ok(enforced.has(n),
        `llms.txt's ${key} claim carries "${n}", which is not an enforced limit or the ladder price: ${sentence}`)
    }
  }
  // Positive control for the extraction: a sentence with an invented number
  // would be caught.
  assert.ok(!enforced.has('1000'), 'the enforced set now contains 1,000 — re-read api/_lib/plans.js')
})

test('the claims that shipped false before are not in the file', () => {
  // Named so they can never come back quietly. "1,000 AI actions" and "$4.99"
  // are the two the doc-authority map records; the tokens claim is the one
  // found on 2026-09-08.
  assert.ok(!/1,?000/.test(COMMITTED), 'llms.txt advertises 1,000 AI generations again')
  assert.ok(!/4\.99/.test(COMMITTED), 'llms.txt quotes the pre-ladder $4.99 again')
  assert.ok(!/\bAUD\b/.test(COMMITTED), 'llms.txt names AUD over a USD ladder again')
  assert.ok(!/design tokens/i.test(COMMITTED.split('\n## Tools')[0]),
    'the summary sells design-token export again, which exportFormats.js does not mark live')
})

test('no unbuilt export format is described as available, and the Pro ones are named', () => {
  const unbuilt = unbuiltFormats()
  assert.ok(unbuilt.length > 0, 'nothing is unbuilt — this test has stopped discriminating')
  const { freePlan, proPlan, notBuilt } = llmsClaims()
  for (const f of unbuilt) {
    assert.ok(!freePlan.includes(f.name) && !proPlan.includes(f.name),
      `llms.txt offers "${f.name}" on a plan; src/config/exportFormats.js does not mark it live`)
    assert.ok(notBuilt.includes(f.name), `the unbuilt "${f.name}" is not disclosed as unbuilt`)
  }
  for (const f of proOnlyFormats()) {
    assert.ok(proPlan.includes(f.name), `Pro no longer names "${f.name}", the export it actually gates`)
    assert.ok(!freePlan.includes(f.name), `Free is offered the gated "${f.name}"`)
  }
  for (const f of freeFormats()) {
    const m = /\(([^)]+)\)\s*$/.exec(f.name)
    const short = m ? m[1] : f.name
    assert.ok(freePlan.includes(short), `Free no longer lists ${f.name}`)
  }
  assert.equal(EXPORT_FORMATS.some((f) => f.pro && !f.live), false)
})

// ─────────────────────────────────────────────────────────────────────────────
// 4 · What is listed is live, and what is Soon is not listed as a tool
// ─────────────────────────────────────────────────────────────────────────────
test('every tool listed is live and prerendered; every Soon tool is under Optional and nowhere else', () => {
  const live = new Set(createTools().filter((t) => !t.soon).map((t) => t.route))
  const soon = createTools().filter((t) => t.soon)
  assert.ok(soon.length > 0)
  const prerendered = new Set(prerenderRoutes())

  const [, tools] = COMMITTED.split('\n## Tools\n')
  const toolsSection = tools.split('\n## ')[0]
  const listedUrls = [...toolsSection.matchAll(/\]\((https:\/\/www\.uil4b\.com(\/[^)]*))\)/g)]
  assert.ok(listedUrls.length >= 10, 'the Tools section has almost nothing in it')
  for (const [, , route] of listedUrls) {
    assert.ok(prerendered.has(route), `${route} is listed as a tool but gets no prerendered shell`)
  }
  for (const t of createTools()) {
    if (t.soon) continue
    assert.ok(toolsSection.includes(`(https://www.uil4b.com${t.route})`),
      `the live tool ${t.label} (${t.route}) is missing from the Tools section`)
  }

  const optional = COMMITTED.split('\n## Optional\n')[1]
  assert.ok(optional, 'the Optional section is gone')
  for (const t of soon) {
    assert.ok(optional.includes(`(${t.route})`), `the Soon tool ${t.label} is not disclosed under Optional`)
    assert.ok(!toolsSection.includes(t.route), `the Soon tool ${t.label} is listed as a live tool`)
    assert.ok(!COMMITTED.includes(`https://www.uil4b.com${t.route}`),
      `the Soon tool ${t.label} is advertised by absolute URL`)
  }
  assert.ok(live.size >= 10)
})

test('every description is the route’s own meta description, not a second copy', () => {
  // The prose on each row is the routeMetaMap.js entry — the same table every
  // prerendered <meta name="description"> comes from — so a tool description
  // cannot be corrected on the page and left stale for the machine.
  const rows = [...COMMITTED.matchAll(/^- \[[^\]]+\]\(https:\/\/www\.uil4b\.com(\/[^)]*)\): (.+)$/gm)]
  assert.ok(rows.length >= 20, `only ${rows.length} linked rows found`)
  for (const [, route, description] of rows) {
    assert.equal(description, PAGE_DESCRIPTIONS[route],
      `${route} carries a description that is not its routeMetaMap.js entry`)
  }
})

// ─────────────────────────────────────────────────────────────────────────────
// 5 · THE WIRING. The served copy is written by the build, from this generator.
// ─────────────────────────────────────────────────────────────────────────────
test('prerender.mjs writes dist/llms.txt from buildLlmsTxt(), and package.json can regenerate the committed one', () => {
  const prerender = stripComments(read('scripts/prerender.mjs'))
  assert.match(prerender, /import \{ buildLlmsTxt \} from '\.\/llms-txt\.mjs'/,
    'prerender.mjs no longer imports the generator')
  assert.match(prerender, /writeFile\(path\.join\(dist, 'llms\.txt'\), buildLlmsTxt\(\), 'utf8'\)/,
    'prerender.mjs no longer writes dist/llms.txt from the generator — a stale commit would ship')
  const pkg = JSON.parse(read('package.json'))
  assert.equal(pkg.scripts['sync:llms'], 'node scripts/llms-txt.mjs', 'the sync:llms script is gone')
  assert.match(pkg.scripts.build, /node scripts\/prerender\.mjs/, 'the build no longer runs prerender.mjs')
})
