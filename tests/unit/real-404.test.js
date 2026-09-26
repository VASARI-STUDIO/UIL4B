// An address that is not a page must answer HTTP 404 — not 200 with a page
// that says "not found".
//
// Measured on production: `/nope`, `/security.txt`,
// `/.well-known/security.txt` and `/settings` all answered **200**, each with
// the noindex 404 shell. The cause was the last rewrite in vercel.json,
// `/((?!api/|assets/).*)` → `/404.html`: a rewrite keeps the status of the
// file it serves, so every unknown path was a 200. Crawlers call that a soft
// 404, scanners read `/security.txt` as present, and uptime checks on a dead
// link pass.
//
// The fix is to list the client-only routes (the private and flow pages the
// app renders but does not prerender) explicitly and drop the catch-all. A
// path that matches nothing then falls to Vercel's own handling, which serves
// dist/404.html WITH a 404 status — the same shell, the same NotFound page,
// the honest code.
//
// HOW THIS EMULATES VERCEL, AND WHERE IT STOPS. Vercel answers a request in
// this order: trailing-slash normalisation, `redirects`, the filesystem,
// `rewrites`, then the 404 page. `resolve()` below walks the same order over
// vercel.json. It can only be faithful because every rewrite source is a
// literal path (asserted below) apart from the `/p/:code` share link, so
// "matches" is string equality and not a reimplementation of path-to-regexp.
// What it cannot prove is Vercel's own claim that an unmatched path gets
// dist/404.html with status 404; that needs one curl against a preview
// deployment, and the PR says so.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { allKnownRoutes, prerenderRoutes } from '../../scripts/route-matrix.mjs'

const REPO = process.cwd()
const config = JSON.parse(fs.readFileSync(path.join(REPO, 'vercel.json'), 'utf8'))

/** Is this a file Vercel would find in the output before any rewrite runs?
 *  Public files are copied to dist/ verbatim, so public/ answers for them
 *  without a build. */
function isStaticFile(p) {
  if (p === '/' || p.endsWith('/')) return false
  const inPublic = path.join(REPO, 'public', ...p.split('/').filter(Boolean))
  return fs.existsSync(inPublic) && fs.statSync(inPublic).isFile()
}

function resolve(p) {
  if (config.trailingSlash === false && p !== '/' && p.endsWith('/')) {
    return { status: 308, to: p.replace(/\/+$/, '') }
  }
  const redirect = (config.redirects || []).find((r) => r.source === p)
  if (redirect) return { status: redirect.permanent ? 301 : 307, to: redirect.destination }
  if (p === '/' || isStaticFile(p)) return { status: 200, file: p }
  for (const r of config.rewrites || []) {
    if (r.source === '/p/:code' ? /^\/p\/[^/]+$/.test(p) : r.source === p) {
      return { status: 200, file: r.destination }
    }
  }
  return { status: 404, file: '/404.html' }
}

test('there is no catch-all rewrite, so an unknown path can be a 404', () => {
  for (const r of config.rewrites) {
    if (r.source === '/p/:code') continue
    assert.match(r.source, /^\/[a-z0-9/-]*$/,
      `rewrite ${r.source} is a pattern, not a path — a pattern here is how every `
      + 'unknown URL became a 200')
  }
})

test('addresses that are not pages answer 404', () => {
  for (const p of [
    '/nope',
    '/this-does-not-exist',
    '/security.txt',
    '/.well-known/security.txt',
    '/humans.txt',
    '/wp-admin',
    '/.env',
    '/create/nonexistent',
    '/learn/nonsense',
    '/discover/nonsense',
    '/settings/nonsense',
  ]) {
    assert.equal(resolve(p).status, 404, `${p} answers ${resolve(p).status}`)
  }
})

test('every route the app renders is still served a shell', () => {
  const known = allKnownRoutes()
  // Positive control: the enumeration is the whole surface, not an empty list
  // that makes "every route" trivially true.
  assert.ok(known.length >= 60, `only ${known.length} routes were enumerated`)
  for (const route of known) {
    const r = resolve(route)
    assert.ok(r.status === 200 || r.status === 301,
      `${route} answers ${r.status} — a real page would be served the 404 page`)
  }
  // The private and flow pages by name, so this cannot pass by agreeing with a
  // broken enumeration of itself.
  for (const route of [
    '/settings', '/projects', '/login', '/checkout', '/checkout/return',
    '/admin', '/onboarding', '/style-guide', '/create/box-shadow', '/create/typography',
  ]) {
    assert.deepEqual(resolve(route), { status: 200, file: '/404.html' },
      `${route} must boot the SPA from the noindex shell`)
  }
  for (const route of prerenderRoutes()) {
    assert.deepEqual(resolve(route), { status: 200, file: `${route}/index.html` })
  }
  assert.equal(resolve('/p/abc123').status, 200, 'the share shortlink still reaches the function')
})

test('a trailing slash is one redirect to the real page, not a second copy or a 404', () => {
  assert.equal(config.trailingSlash, false)
  for (const route of ['/learn/', '/settings/', '/create/palette/']) {
    const r = resolve(route)
    assert.equal(r.status, 308)
    assert.equal(resolve(r.to).status, 200)
  }
})

test('real files are still served as files', () => {
  for (const p of ['/robots.txt', '/sitemap.xml', '/llms.txt', '/favicon.svg']) {
    assert.equal(resolve(p).status, 200, `${p} is a file in public/ and must be served`)
  }
})
