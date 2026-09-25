// public/llms.txt, derived rather than typed. `npm run sync:llms`.
//
// ── The defect this ends ────────────────────────────────────────────────────
//
// llms.txt is the one document on this site written FOR a machine deciding
// what the product is, and it was the last sales surface still typed by hand.
// docs/reference/doc-authority-map.md records four faults found in it on
// 2026-09-06 (a pre-ladder price, five 301'd doc URLs, four Soon tools listed
// as live, an anchor that exists nowhere) and closes with "a guard tying
// llms.txt to planLadder.js is the durable fix". By 2026-09-08 it had drifted
// again: the Brand Starter — live, mounted, metered — was missing from the
// tools list while its old name sat under "Not yet built", and the summary
// sold "production-ready CSS and design tokens" exports that
// src/config/exportFormats.js has never marked live.
//
// None of that was a typo. It was the same mechanism every truth test in
// tests/unit/ exists for: a capability DESCRIBED in prose instead of DERIVED
// from the thing that implements it. Prose does not go stale loudly.
//
// ── Everything below is read from the module that owns it ───────────────────
//
//   the value claim     src/data/positioning.js — the founder's own sentence,
//                       by the id SURFACE_LINE assigns to this surface
//   the price + limits  scripts/site-pricing.mjs, which is what index.html's
//                       <noscript> already prints — one sentence, two surfaces
//   the AI numbers      src/config/plans.js (mirrors api/_lib/plans.js) and
//                       src/config/aiGeneration.js (mirrors api/_lib/aiGeneration.js)
//   the export offer    src/config/exportFormats.js — free, Pro-only, unbuilt
//   the tools           src/data/toolTree.js — live/soon flags; descriptions
//                       from src/data/routeMetaMap.js, the same table every
//                       prerendered <meta name="description"> is written from
//   the guides          src/data/learnIndex.js
//   the URLs            src/utils/routeMeta.js canonicalUrl(), so a retired
//                       path or a non-canonical alias cannot be advertised
//
// GENERATED AND COMMITTED, the way public/sitemap.xml is: the generator is the
// source of truth, the committed file is what git diff shows a reviewer, and
// tests/unit/llms-txt-truth.test.js fails the build if they disagree. The
// SERVED copy is written by scripts/prerender.mjs into dist/ from the same
// function, so even a stale commit cannot ship a stale file.
//
// Explicit `.js` extensions because this runs in bare Node, like every other
// script here.
import { writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { SURFACE_LINE, line } from '../src/data/positioning.js'
import { AI_LIMITS } from '../src/config/plans.js'
import { BRAND_STARTER_BETA, allowanceSentence } from '../src/config/aiGeneration.js'
import { freeFormats, proOnlyFormats, unbuiltFormats } from '../src/config/exportFormats.js'
import { cheapestPerMonth, formatMoney, resolvePlanLadder } from '../src/config/planLadder.js'
import { CREATE_GROUPS, DISCOVER_GROUPS, createTools } from '../src/data/toolTree.js'
import { LEARN_ARTICLES } from '../src/data/learnIndex.js'
import { PAGE_DESCRIPTIONS, PAGE_TITLES } from '../src/data/routeMetaMap.js'
import { TOOL_ENTRIES } from '../src/data/toolIndex.js'
import { canonicalUrl } from '../src/utils/routeMeta.js'
import { CURRENCY_CODE, pricingSentence } from './site-pricing.mjs'
import { prerenderRoutes } from './route-matrix.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// "UI L4B | Palette Generator" → "Palette Generator". The title table is the
// one place every public route already has a human name; the tool tree's
// labels are nav-length ("Palette", "Tint") and read as fragments in a list.
const TITLE_PREFIX = /^UI L4B \| /
const nameOf = (route) => {
  const title = PAGE_TITLES[route]
  if (!title) throw new Error(`llms-txt: ${route} has no title in routeMetaMap.js`)
  return title.replace(TITLE_PREFIX, '')
}
const descriptionOf = (route) => {
  const desc = PAGE_DESCRIPTIONS[route]
  if (!desc) throw new Error(`llms-txt: ${route} has no description in routeMetaMap.js`)
  return desc
}

/** "HTML, Markdown, PNG and JPEG" — the short form /plans uses. */
const shortName = (f) => {
  const inParens = /\(([^)]+)\)\s*$/.exec(f.name)
  return inParens ? inParens[1] : f.name
}
const listNames = (names) => (names.length < 2
  ? names.join('')
  : `${names.slice(0, -1).join(', ')} and ${names[names.length - 1]}`)

/**
 * The routes each section lists, every one asserted against the prerender
 * matrix — a URL that gets no crawlable shell has no business in a file that
 * tells a crawler what to read.
 */
export function llmsRoutes() {
  const prerendered = new Set(prerenderRoutes())
  const mustBePrerendered = (route, where) => {
    if (!prerendered.has(route)) {
      throw new Error(`llms-txt: ${where} lists ${route}, which the route matrix does not prerender`)
    }
    return route
  }

  const live = createTools().filter((t) => !t.soon)
  const liveRoutes = new Set(live.map((t) => t.route))
  // The Create tools that mount, in tree order.
  const tools = live.map((t) => ({
    route: mustBePrerendered(t.route, 'the Tools section'),
    beta: t.beta,
  }))
  // Surfaces the search index declares outside the Create tree, kept only when
  // they render as a page of their own rather than resolving to a Discover or
  // Learn destination those sections already list. Today that is /seo.
  for (const entry of TOOL_ENTRIES) {
    const route = entry.path
    if (liveRoutes.has(route) || /^\/(discover|learn)(\/|$)/.test(route)) continue
    if (!prerendered.has(route)) continue
    if (tools.some((t) => t.route === route)) continue
    tools.push({ route, beta: false })
  }

  const learn = LEARN_ARTICLES.map((a) => mustBePrerendered(`/learn/${a.slug}`, 'the Learn section'))

  // Discover rows that are live and are not a Create tool wearing a second
  // hat (Font Gallery and Icon Library are Create routes, listed above).
  const browse = DISCOVER_GROUPS
    .filter((g) => !g.soon && !liveRoutes.has(g.route) && g.route !== '/discover')
    .map((g) => mustBePrerendered(g.route, 'the Browse section'))

  // Not derived from a flag — there is no registry of "the pages about the
  // product" — so each one is checked against the matrix instead.
  // `/credits` is here with the other two legal surfaces because it answers the
  // same kind of question they do — what this product is bound by — and because
  // a machine summarising the product should be able to see which third-party
  // work it is built on without inferring it from the tool list.
  const more = ['/plans', '/mobile', '/help', '/principles', '/sitemap', '/privacy', '/terms', '/credits']
    .map((r) => mustBePrerendered(r, 'the More section'))

  // Still in the workshop: every tool the tree marks Soon, group Soon included.
  const soon = CREATE_GROUPS.flatMap((g) => (
    g.soon ? g.tools : g.tools.filter((t) => t.soon)
  )).map((t) => ({ label: t.label, route: t.route }))

  return { tools, learn, browse, more, soon }
}

/**
 * The sentences this file composes ITSELF, as opposed to the descriptions it
 * copies verbatim from routeMetaMap.js. Exported separately so the truth test
 * can hold every number in them to the enforced figure without having to
 * excuse the numbers that arrive inside a meta description.
 */
export function llmsClaims() {
  const free = freeFormats().map(shortName)
  const pro = proOnlyFormats().map((f) => f.name)
  const unbuilt = unbuiltFormats().map((f) => f.name)
  const lead = cheapestPerMonth(resolvePlanLadder())
  const proPrice = lead
    ? `from ${formatMoney(lead.perMonth, lead.currency)} ${CURRENCY_CODE} a month`
    : 'priced on the plans page'
  const beta = BRAND_STARTER_BETA ? ' (beta)' : ''
  return {
    summary: `${line(SURFACE_LINE.llmsSummary)} ${pricingSentence()}`,
    freePlan: `Free: ${AI_LIMITS.free.daily} AI generations a day and ${AI_LIMITS.free.monthly} a month; `
      + `style guide export in ${listNames(free)}, with a "Made with UIL4B" footer line; `
      + `Brand Starter${beta} ${allowanceSentence('free')}.`,
    proPlan: `Pro, ${proPrice}: ${AI_LIMITS.pro.daily} AI generations a day and ${AI_LIMITS.pro.monthly} a month; `
      + `adds ${listNames(pro)}; removes the footer line; `
      + `Brand Starter${beta} ${allowanceSentence('pro')}. Same AI model as Free.`,
    notBuilt: `Not built, on any plan, and not for sale: ${listNames(unbuilt)}.`,
  }
}

/** The whole file, LF line endings. */
export function buildLlmsTxt() {
  const { tools, learn, browse, more, soon } = llmsRoutes()
  const claims = llmsClaims()
  const row = (route, suffix = '') => `- [${nameOf(route)}${suffix}](${canonicalUrl(route)}): ${descriptionOf(route)}`

  return [
    '# UIL4B',
    '',
    `> ${claims.summary}`,
    '',
    '## Tools',
    ...tools.map((t) => row(t.route, t.beta ? ' (beta)' : '')),
    '',
    '## Learn',
    `${learn.length} published reference guides. Neutral and factual — design education, not documentation for these tools.`,
    '',
    row('/learn'),
    ...learn.map((r) => row(r)),
    '',
    '## Browse',
    row('/discover'),
    ...browse.map((r) => row(r)),
    '',
    '## Plans',
    `- ${claims.freePlan}`,
    `- ${claims.proPlan}`,
    `- ${claims.notBuilt}`,
    '',
    '## More',
    ...more.map((r) => row(r)),
    '',
    '## Optional',
    'Not yet built. These routes resolve to an honest "still in the workshop" state rather than a working tool, and should not be described as available:',
    '',
    ...soon.map((t) => `- ${t.label} (${t.route})`),
    '',
  ].join('\n')
}

// Run directly (not when imported by prerender.mjs or the test).
if (process.argv[1]?.endsWith('llms-txt.mjs')) {
  const text = buildLlmsTxt()
  await writeFile(path.join(root, 'public', 'llms.txt'), text, 'utf8')
  const { tools, learn, browse, soon } = llmsRoutes()
  console.log(
    `sync:llms — wrote public/llms.txt: ${tools.length} tools, ${learn.length} guides, `
    + `${browse.length} browse pages, ${soon.length} still in the workshop`,
  )
}
