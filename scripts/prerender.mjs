// Post-build prerender: give every indexable route its own HTML file carrying
// its own <title>, description, canonical and OG/Twitter tags.
//
// WHY. This is a client-rendered SPA, so `updateRouteMeta()` only runs once a
// browser has executed the bundle. Everything that does NOT execute JS — every
// social unfurler (Facebook, LinkedIn, Slack, X, Discord), and any crawler
// reading raw HTML — was served dist/index.html for every URL. That meant:
//
//   • every shared tool link unfurled as the homepage card;
//   • all ~26 URLs declared `canonical = https://www.uil4b.com`, which is an
//     explicit instruction to drop them from the index;
//   • the <noscript> block was homepage copy on every one of them, so a non-JS
//     crawler also saw ~26 byte-identical pages.
//
// This does NOT render React. It clones the built shell per route and rewrites
// the head — which is all that was actually broken. Full SSR would buy little
// here and cost a second rendering path to keep correct.
//
// The route list is the crawler sitemap, and the copy comes from the same
// src/data/routeMetaMap.js the runtime imports, so the served HTML and the
// hydrated page cannot disagree.

import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { existsSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEFAULT_DESCRIPTION, PAGE_DESCRIPTIONS, PAGE_TITLES } from '../src/data/routeMetaMap.js'
import { JSONLD_MARKER, PRICING_MARKER, ladderOffers } from './site-pricing.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const dist = path.join(root, 'dist')
const ORIGIN = 'https://www.uil4b.com'

/** Escape for an HTML attribute value. Titles carry `|`, descriptions carry
 *  apostrophes and em dashes — none of which may break out of the attribute. */
const attr = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/"/g, '&quot;')
  .replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** Escape for text between tags (the <title> element). */
const text = (s) => String(s)
  .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

/** The routes to emit: exactly what the crawler sitemap advertises. Reading it
 *  rather than keeping a second list means a route added to one is never
 *  silently missing from the other. */
async function routesFromSitemap() {
  const xml = await readFile(path.join(root, 'public', 'sitemap.xml'), 'utf8')
  const out = []
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const url = new URL(m[1])
    if (url.pathname !== '/') out.push(url.pathname.replace(/\/+$/, ''))
  }
  return [...new Set(out)]
}

/**
 * Rewrite one head. Every replacement is anchored to the exact tag the built
 * index.html contains, and each one asserts it actually matched — a silent
 * no-op here would ship the homepage's metadata again while the build stayed
 * green, which is precisely the failure this script exists to end.
 */
function rewriteHead(html, { route, title, description, robots = null, canonicalUrl = null }) {
  const canonical = canonicalUrl ?? `${ORIGIN}${route}`
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
  const routes = await routesFromSitemap()
  if (!routes.length) {
    console.error('prerender: no routes found in public/sitemap.xml')
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

    const { html, misses } = rewriteHead(shell, { route, title, description })
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
  const notFound = rewriteHead(shell, {
    route: '/404',
    title: 'UI L4B | Page not found',
    description: 'That page does not exist. Browse the tools, or head back to the homepage.',
    robots: 'noindex,follow',
    canonicalUrl: `${ORIGIN}/404`,
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

  console.log(`prerender: wrote ${routes.length} route shells + a noindex 404 shell.`)
}

main().catch((err) => { console.error('prerender failed:', err); process.exit(1) })
