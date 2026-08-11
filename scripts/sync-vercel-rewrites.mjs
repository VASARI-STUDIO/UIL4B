// Generate the explicit per-route rewrites that make prerendering actually work.
//
// vercel.json's catch-all — `/((?!api/|assets/).*)` → `/index.html` — sends
// every path to the root shell. Vercel is documented to check the filesystem
// before applying rewrites, which would serve dist/typescale/index.html for
// /typescale and leave the catch-all alone. But "documented to" is not
// "verified", and Vite's own preview server does the opposite (its SPA
// fallback wins), which is exactly how a prerender ships and silently does
// nothing while every gate stays green.
//
// So the routes are listed explicitly, ahead of the catch-all, and matched by
// exact path. There is no ordering subtlety left to be wrong about.
//
// Run via `npm run sync:rewrites`. tests/unit/prerender-routes.test.js fails if
// vercel.json and the sitemap ever disagree, so this cannot rot.
import { readFile, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

export async function prerenderRoutes() {
  const xml = await readFile(path.join(root, 'public', 'sitemap.xml'), 'utf8')
  const out = []
  for (const m of xml.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)) {
    const { pathname } = new URL(m[1])
    if (pathname !== '/') out.push(pathname.replace(/\/+$/, ''))
  }
  return [...new Set(out)].sort()
}

export function buildRewrites(routes) {
  return [
    { source: '/p/:code', destination: '/api/share?c=:code' },
    ...routes.map(r => ({ source: r, destination: `${r}/index.html` })),
    { source: '/((?!api/|assets/).*)', destination: '/index.html' },
  ]
}

// Run directly (not when imported by the test, which only wants the helpers).
if (process.argv[1]?.endsWith('sync-vercel-rewrites.mjs')) {
  const file = path.join(root, 'vercel.json')
  const config = JSON.parse(await readFile(file, 'utf8'))
  config.rewrites = buildRewrites(await prerenderRoutes())
  await writeFile(file, `${JSON.stringify(config, null, 2)}\n`, 'utf8')
  console.log(`sync:rewrites — wrote ${config.rewrites.length} rewrites to vercel.json`)
}
