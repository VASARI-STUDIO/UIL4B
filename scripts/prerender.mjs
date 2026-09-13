// Post-build prerender: give every indexable route its own HTML file carrying
// its own <title>, description, canonical and OG/Twitter tags.
//
// WHY. This is a client-rendered SPA, so `updateRouteMeta()` only runs once a
// browser has executed the bundle. Everything that does NOT execute JS — every
// social unfurler (Facebook, LinkedIn, Slack, X, Discord), and any crawler
// reading raw HTML — was served dist/index.html for every URL. That meant:
//
//   • every shared tool link unfurled as the homepage card — the WORDS were
//     fixed first and the PICTURE was not, so until og:image was written per
//     route as well, a link to the Contrast Checker still showed the homepage;
//   • all ~26 URLs declared the HOMEPAGE as their canonical, which is an
//     explicit instruction to drop them from the index. That fixed the
//     per-ROUTE half of the canonical and left the HOST half unchecked: on
//     2026-09-13 all 40 shells still named a `www` host that does not
//     serve. See SITE_ORIGIN in src/utils/routeMeta.js for the measurement
//     and the founder's decision;
//   • the <noscript> block was homepage copy on every one of them, so a non-JS
//     crawler also saw ~26 byte-identical pages.
//
// This does NOT render React. It clones the built shell per route and rewrites
// the head — which is all that was actually broken. Full SSR would buy little
// here and cost a second rendering path to keep correct.
//
// The route list is the explicit matrix in scripts/route-matrix.mjs (it used to
// be public/sitemap.xml, which could not express a route that must be
// prerendered but NOT advertised — see that file). The copy comes from the same
// src/data/routeMetaMap.js the runtime imports, and the canonical and robots
// directives come from the same src/utils/routeMeta.js functions App.jsx calls
// on every navigation, so the served HTML and the hydrated page cannot
// disagree — there is one implementation of each, not two.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS, PAGE_TITLES } from '../src/data/routeMetaMap.js'
import { SITE_ORIGIN, canonicalUrl, robotsFor } from '../src/utils/routeMeta.js'
import { prerenderRoutes } from './route-matrix.mjs'
import { DEFAULT_CARD, cardFor, cardUrl } from './share-cards.mjs'
import { breadcrumbJsonLd, breadcrumbRoutes } from './route-schema.mjs'
import { JSONLD_MARKER, PRICING_MARKER, ladderOffers } from './site-pricing.mjs'
import { buildLlmsTxt } from './llms-txt.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
// Imported, never retyped. A second spelling of the origin here is exactly
// how 40 shells came to advertise a hostname that does not answer.
const ORIGIN = SITE_ORIGIN

/** Escape for an HTML attribute value. Titles carry `|`, descriptions carry
 *  apostrophes and em dashes — none of which may break out of the attribute. */
const attr = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Escape for text between tags (the <title> element). */
const text = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')


/**
 * Rewrite one head. Every replacement is anchored to the exact tag the built
 * index.html contains, and each one asserts it actually matched — a silent
 * no-op here would ship the homepage's metadata again while the build stayed
 * green, which is precisely the failure this script exists to end.
 */
function rewriteHead(html, { title, description, robots, canonical, card, schema = '' }) {
  const misses = []
  const sub = (label, re, next) => {
    if (!re.test(html)) { misses.push(label); return }
    html = html.replace(re, next)
  }

  // The 404 shell needs `noindex` in the SERVED html, not just after React has
  // run — a crawler that does not execute JS is exactly the reader that would
  // otherwise index it.
  //
  // SUBSTITUTED, never inserted. index.html already ships a static
  // `<meta name="robots" content="index,follow">`, so appending produced two
  // contradictory robots tags in one head. Google resolves that conflict by
  // taking the most restrictive, so it happened to behave — but shipping a
  // contradiction and relying on a tie-break rule is not the same as being
  // correct, and the next reader has no way to tell which one is intended.
  if (robots) {
    sub('robots', /<meta\s+name="robots"\s+content="[^"]*"\s*\/?>/,
      `<meta name="robots" content="${attr(robots)}" />`)
  }

  sub('title', /<title>[\s\S]*?<\/title>/, `<title>${text(title)}</title>`)
  sub('description', /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${attr(description)}" />`)
  // A shell carrying `noindex` gets NO canonical. Asserting "this is the
  // authoritative version of this page" in the same head that says "do not keep
  // this" is a contradiction, and pointing it at `/` instead would funnel every
  // typo's signals into the homepage. Saying nothing is the honest option.
  if (robots && robots.includes('noindex')) {
    sub('canonical', /\s*<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/, '')
  } else {
    sub('canonical', /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
      `<link rel="canonical" href="${attr(canonical)}" />`)
  }
  sub('og:title', /<meta\s+property="og:title"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:title" content="${attr(title)}" />`)
  sub('og:description', /<meta\s+property="og:description"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:description" content="${attr(description)}" />`)
  sub('og:url', /<meta\s+property="og:url"\s+content="[^"]*"\s*\/?>/,
    `<meta property="og:url" content="${attr(canonical)}" />`)
  sub('twitter:title', /<meta\s+name="twitter:title"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:title" content="${attr(title)}" />`)
  sub('twitter:description', /<meta\s+name="twitter:description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="twitter:description" content="${attr(description)}" />`)

  // ── The share card ────────────────────────────────────────────────────────
  //
  // The half of the unfurl this script did not fix the first time. Titles and
  // descriptions were already per-route; og:image was not, so every one of the
  // shells pointed at /previews/og-image.png and a link to any tool showed the
  // homepage picture. See scripts/share-cards.mjs for why the answer is one
  // card per SECTION rather than 28 pieces of per-route art.
  //
  // og:image:alt moves with the image. An alt that still describes the homepage
  // card while the image is the Colour card is worse than no alt: it is a wrong
  // description read aloud to exactly the people who cannot see the picture.
  if (card) {
    const src = cardUrl(ORIGIN, card)
    sub('og:image', /<meta\s+property="og:image"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:image" content="${attr(src)}" />`)
    sub('og:image:alt', /<meta\s+property="og:image:alt"\s+content="[^"]*"\s*\/?>/,
      `<meta property="og:image:alt" content="${attr(card.alt)}" />`)
    sub('twitter:image', /<meta\s+name="twitter:image"\s+content="[^"]*"\s*\/?>/,
      `<meta name="twitter:image" content="${attr(src)}" />`)
  }

  // ── Per-route structured data ─────────────────────────────────────────────
  //
  // Appended as its own <script>, beside the site-level WebApplication block
  // rather than merged into it: they describe different entities, and multiple
  // ld+json blocks in one head is the shape every consumer expects. Inserted
  // before </head> and asserted like every other replacement — a silent miss
  // here would drop the schema while the build stayed green.
  if (schema) {
    sub('schema', /<\/head>/, `${schema}</head>`)
  }

  // The <noscript> fallback was the homepage's own sales copy, repeated on
  // every URL. Replaced with something true for the page it is actually on.
  html = html.replace(
    /<noscript>[\s\S]*?<\/noscript>/,
    `<noscript><h1>${text(title)}</h1><p>${text(description)}</p>`
    + `<p>UIL4B needs JavaScript enabled. <a href="${attr(ORIGIN)}/">Return to the homepage</a>.</p></noscript>`,
  )

  return { html, misses }
}

/**
 * The built shell must carry the ladder's price, not a placeholder.
 *
 * vite.config.js's `transformIndexHtml` hook fills index.html's pricing markers
 * from src/config/planLadder.js. This asserts it actually ran and actually
 * produced the ladder's amounts — because the way that hook fails is silently:
 * a plugin dropped from the array, an `order` change, a marker renamed in one
 * file and not the other. Every one of those leaves a green build serving a
 * page whose price is missing or stale, which is the exact failure the
 * derivation was built to end. Cheap to check here, and this is the only step
 * that reads the finished shell.
 */
function assertPricingSubstituted(html) {
  for (const marker of [JSONLD_MARKER, PRICING_MARKER]) {
    if (html.includes(marker)) {
      console.error(`prerender: dist/index.html still contains ${marker}.`)
      console.error('prerender: the pricing hook in vite.config.js did not run — the shell has no price.')
      process.exit(1)
    }
  }
  const missing = ladderOffers()
    .filter((offer) => !html.includes(`"price": "${offer.price}"`))
    .map((offer) => `${offer.name} (${offer.price})`)
  if (missing.length) {
    console.error(`prerender: dist/index.html does not quote the plan ladder: ${missing.join(', ')}.`)
    console.error('prerender: the JSON-LD offers and src/config/planLadder.js disagree.')
    process.exit(1)
  }
}

async function main() {
  if (!existsSync(path.join(dist, 'index.html'))) {
    console.error('prerender: dist/index.html not found — run `vite build` first.')
    process.exit(1)
  }
  const shell = await readFile(path.join(dist, 'index.html'), 'utf8')
  assertPricingSubstituted(shell)
  const routes = prerenderRoutes()
  if (!routes.length) {
    console.error('prerender: the route matrix is empty — see scripts/route-matrix.mjs')
    process.exit(1)
  }

  const allMisses = new Set()
  const untitled = []

  for (const route of routes) {
    const title = PAGE_TITLES[route]
    const description = PAGE_DESCRIPTIONS[route] || DEFAULT_DESCRIPTION
    // A sitemap route with no title of its own would be emitted carrying the
    // homepage's — the exact bug this script fixes — so it is reported rather
    // than quietly written.
    if (!title) { untitled.push(route); continue }

    // Canonical and robots come from the runtime's own functions rather than
    // being rebuilt here. The old `ORIGIN + route` was right for every route
    // this script happened to emit and WRONG for /home, which routeMeta.js
    // canonicalises onto `/` — exactly the kind of near-miss that survives a
    // review because it is correct on 27 of 28 rows.
    const { html, misses } = rewriteHead(shell, {
      title,
      description,
      robots: robotsFor(route),
      canonical: canonicalUrl(route),
      card: cardFor(route),
      schema: breadcrumbJsonLd(route, ORIGIN),
    })
    misses.forEach(m => allMisses.add(m))

    const dir = path.join(dist, route.replace(/^\//, ''))
    await mkdir(dir, { recursive: true })
    await writeFile(path.join(dir, 'index.html'), html, 'utf8')
  }

  // ── The 404 shell ─────────────────────────────────────────────────────────
  // vercel.json's catch-all serves this for every URL that matched no explicit
  // route, so it is what a crawler receives for a typo, a dead backlink or a
  // hallucinated URL. It previously received dist/index.html: status 200,
  // `index,follow`, and the homepage's content and canonical — an instruction
  // to index unlimited duplicates of the homepage.
  //
  // It carries NO canonical of its own. Pointing every unknown URL at `/` would
  // consolidate junk into the homepage's signals, and self-canonicalising would
  // assert the page is real. `noindex` says the true thing: don't keep this.
  // No card of its own and no breadcrumb: a page that does not exist has no
  // place in a hierarchy, and drawing it a card would be dressing up a dead
  // end. It keeps the site card, which is the honest picture for "you are on
  // uil4b.com, but not on a page".
  const notFound = rewriteHead(shell, {
    title: 'UI L4B | Page not found',
    description: 'That page does not exist. Browse the tools, or head back to the homepage.',
    robots: 'noindex,follow',
    canonical: `${ORIGIN}/404`,
    card: DEFAULT_CARD,
  })
  notFound.misses.forEach(m => allMisses.add(m))
  await writeFile(path.join(dist, '404.html'), notFound.html, 'utf8')

  if (allMisses.size) {
    console.error(`prerender: these tags were not found in dist/index.html and were NOT rewritten: ${[...allMisses].join(', ')}`)
    console.error('prerender: index.html has changed shape — fix the patterns rather than shipping homepage metadata.')
    process.exit(1)
  }
  if (untitled.length) {
    console.error(`prerender: sitemap routes with no entry in routeMetaMap.js: ${untitled.join(', ')}`)
    process.exit(1)
  }

  // ── llms.txt ─────────────────────────────────────────────────────────────
  // The served copy is written here from the same generator that writes the
  // committed public/llms.txt (`npm run sync:llms`), for the same reason the
  // route shells are: a file read by a machine deciding what this product IS
  // must be derived at build time, not copied from whatever was last committed.
  // Vite has already copied public/ into dist/ by now, so this overwrites it.
  await writeFile(path.join(dist, 'llms.txt'), buildLlmsTxt(), 'utf8')
  console.log('prerender: wrote llms.txt from positioning.js and the config truth tables')

  // The counts are printed because they are the only place a human sees the
  // matrix move. A route silently dropping out of the matrix, or a whole
  // section of share cards going missing, changes a number here.
  const carded = routes.filter((r) => cardFor(r).id !== DEFAULT_CARD.id).length
  const crumbed = breadcrumbRoutes(routes, ORIGIN).length
  console.log(
    `prerender: wrote ${routes.length} route shells + a noindex 404 shell `
    + `(${carded} on a section share card, ${crumbed} with a BreadcrumbList).`,
  )
}

main().catch((err) => { console.error('prerender failed:', err); process.exit(1) })
