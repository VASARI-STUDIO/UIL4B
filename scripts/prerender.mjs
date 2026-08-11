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
function rewriteHead(html, { route, title, description }) {
  const canonical = `${ORIGIN}${route}`
  const misses = []
  const sub = (label, re, next) => {
    if (!re.test(html)) { misses.push(label); return }
    html = html.replace(re, next)
  }

  sub('title', /<title>[\s\S]*?<\/title>/, `<title>${text(title)}</title>`)
  sub('description', /<meta\s+name="description"\s+content="[^"]*"\s*\/?>/,
    `<meta name="description" content="${attr(description)}" />`)
  sub('canonical', /<link\s+rel="canonical"\s+href="[^"]*"\s*\/?>/,
    `<link rel="canonical" href="${attr(canonical)}" />`)
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

async function main() {
  if (!existsSync(path.join(dist, 'index.html'))) {
    console.error('prerender: dist/index.html not found — run `vite build` first.')
    process.exit(1)
  }
  const shell = await readFile(path.join(dist, 'index.html'), 'utf8')
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

  if (allMisses.size) {
    console.error(`prerender: these tags were not found in dist/index.html and were NOT rewritten: ${[...allMisses].join(', ')}`)
    console.error('prerender: index.html has changed shape — fix the patterns rather than shipping homepage metadata.')
    process.exit(1)
  }
  if (untitled.length) {
    console.error(`prerender: sitemap routes with no entry in routeMetaMap.js: ${untitled.join(', ')}`)
    process.exit(1)
  }

  console.log(`prerender: wrote ${routes.length} route shells with per-route metadata.`)
}

main().catch((err) => { console.error('prerender failed:', err); process.exit(1) })
