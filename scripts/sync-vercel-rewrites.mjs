// Generate the explicit per-route rewrites that make prerendering actually work.
//
// vercel.json's catch-all — `/((?!api/|assets/).*)` → `/index.html` — sends
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
import { prerenderRoutes } from './route-matrix.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

// Re-exported so tests/unit/prerender-routes.test.js can ask this file the same
// question vercel.json was generated from. The list itself is NOT built here
// any more: it used to be read out of public/sitemap.xml, which silently made
// "prerendered" and "advertised" the same set. scripts/route-matrix.mjs is the
// matrix, and the sitemap is the advertised subset of it.
export { prerenderRoutes }

export function buildRewrites(routes) {
  return [
    { source: '/p/:code', destination: '/api/share?c=:code' },
    ...routes.map(r => ({ source: r, destination: `${r}/index.html` })),
    // Everything that matched no explicit route above gets the NOINDEX 404
    // shell, not index.html. Serving index.html made every typo and dead
    // backlink a 200-status indexable copy of the homepage.
    //
    // The SPA still boots from this shell and renders normally, so private app
    // routes (/settings, /projects, …) keep working — they simply arrive
    // carrying `noindex`, which is what they should have had anyway.
    { source: '/((?!api/|assets/).*)', destination: '/404.html' },
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
