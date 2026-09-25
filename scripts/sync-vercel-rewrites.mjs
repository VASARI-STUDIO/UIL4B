// Generate the explicit per-route rewrites that make prerendering actually work.
//
// THERE IS NO CATCH-ALL. Everything below that describes
// one is the history of why each route is listed; the current shape is: every
// prerendered route → its own shell, every client-only route → the noindex
// 404 shell, and anything else matches nothing, so Vercel serves dist/404.html
// with a real 404 status.
//
// vercel.json's catch-all — `/((?!api/|assets/).*)` → `/index.html` — sent
// every path to the root shell. Vercel is documented to check the filesystem
// before applying rewrites, which would serve dist/create/type-scale/index.html for
// /create/type-scale and leave the catch-all alone. But "documented to" is not
// "verified", and Vite's own preview server does the opposite (its SPA
// fallback wins), which is exactly how a prerender ships and silently does
// nothing while every gate stays green.
//
// So the routes are listed explicitly, ahead of the catch-all, and matched by
// exact path. There is no ordering subtlety left to be wrong about.
//
// Run via `npm run sync:rewrites`. tests/unit/prerender-routes.test.js fails if
// vercel.json and the route matrix ever disagree, so this cannot rot.
//
// It also generates the `redirects` block, from src/data/legacyRoutes.js. Same
// reasoning, one step earlier in the request: a retired URL must be answered
// with an HTTP 301 by the edge, BEFORE any rewrite runs. Vercel evaluates
// `redirects` ahead of `rewrites`, so a path listed in both would 301 and never
// reach the catch-all — which is the entire point, since the catch-all serves
// the `noindex` 404 shell.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { LEGACY_REDIRECTS } from '../src/data/legacyRoutes.js'
import { clientOnlyRoutes, prerenderRoutes } from './route-matrix.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Re-exported so tests/unit/prerender-routes.test.js can ask this file the same
// question vercel.json was generated from. The list itself is NOT built here
// any more: it used to be read out of public/sitemap.xml, which silently made
// "prerendered" and "advertised" the same set. scripts/route-matrix.mjs is the
// matrix, and the sitemap is the advertised subset of it.
export { prerenderRoutes }

export function buildRewrites(routes, clientOnly = clientOnlyRoutes()) {
  return [
    { source: '/p/:code', destination: '/api/share?c=:code' },
    ...routes.map(r => ({ source: r, destination: `${r}/index.html` })),
    // Client-only routes get the NOINDEX 404 shell, by exact path. The SPA
    // boots from it and renders the real page (/settings, /projects, …), which
    // arrives carrying `noindex` — what a private page should carry.
    //
    // This was ONE catch-all, `/((?!api/|assets/).*)` → `/404.html`. It also
    // caught every path that is not a page, and a rewrite keeps the status of
    // the file it serves, so every typo, probe and dead link answered 200: a
    // soft 404. Anything that matches no rule now falls to Vercel, which
    // serves the same dist/404.html with status 404.
    ...clientOnly.map(r => ({ source: r, destination: '/404.html' })),
  ]
}

// `permanent: true` is Vercel's spelling of **301**. It is not a default and it
// is not cosmetic: `permanent: false` emits a 307/302, which tells Google the
// old URL is still the real one and to keep it indexed. Every entry in
// legacyRoutes.js is a permanent rename, so every entry gets a 301.
export function buildRedirects(pairs = LEGACY_REDIRECTS) {
  return pairs.map(([source, destination]) => ({ source, destination, permanent: true }))
}

// Run directly (not when imported by the test, which only wants the helpers).
if (process.argv[1]?.endsWith('sync-vercel-rewrites.mjs')) {
  const file = path.join(root, 'vercel.json')
  const { redirects: _oldRedirects, rewrites: _oldRewrites, headers, ...rest } =
    JSON.parse(await readFile(file, 'utf8'))
  // Rebuilt rather than assigned, so the emitted key order matches the order
  // Vercel evaluates them in — redirects, then rewrites, then headers. JSON key
  // order carries no meaning to Vercel; it carries a lot to the next reader
  // trying to work out which rule answers a request first.
  const config = {
    ...rest,
    redirects: buildRedirects(),
    rewrites: buildRewrites(prerenderRoutes()),
    headers,
  }
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  console.log(
    `sync:rewrites — wrote ${config.redirects.length} redirects `
    + `and ${config.rewrites.length} rewrites to vercel.json`,
  )
}
