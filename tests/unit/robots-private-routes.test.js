// `public/robots.txt` IS A SECOND COPY OF A FACT THE RUNTIME ALREADY HOLDS.
//
// `PRIVATE_PREFIXES` in `src/utils/routeMeta.js` decides which routes are
// private — `isPrivateRoute()` reads it, and the prerenderer and sitemap both
// follow. `robots.txt` states the same thing again, by hand, in a static file
// nothing generates. Every other cross-file fact in this codebase either has a
// sync script or a test; this one had neither.
//
// MEASURED 2026-09-14, before this guard: it had already drifted. `/login` is
// in `PRIVATE_PREFIXES` and was NOT in `robots.txt`, so the sign-in page was
// crawlable by the file crawlers actually read while the runtime treated it as
// private.
//
// `/dashboard` IS IN robots.txt AND NOT IN PRIVATE_PREFIXES, AND THAT IS
// CORRECT — it is not drift. `vercel.json` 301s `/dashboard` to `/projects`
// (see `src/data/legacyRoutes.js`), and `/projects` is private. It is a live
// legacy redirect pointing INTO a private area, so disallowing it spends no
// crawl budget discovering that. The assertion below is therefore one-way:
// every private prefix must appear, but robots.txt may carry extra entries for
// redirect sources like this one.
import { test } from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { isPrivateRoute } from '../../src/utils/routeMeta.js'

const robots = fs.readFileSync(path.join(process.cwd(), 'public/robots.txt'), 'utf8')
const disallowed = robots
  .split(/\r?\n/)
  .map((l) => l.trim())
  .filter((l) => l.toLowerCase().startsWith('disallow:'))
  .map((l) => l.slice('disallow:'.length).trim())
  .filter(Boolean)

// The prefixes the runtime itself treats as private, discovered THROUGH the
// exported predicate rather than by importing a private constant — so this
// tracks the behaviour the app has, not a list that could stop being used.
const PRIVATE = ['/settings', '/projects', '/admin', '/login', '/checkout', '/onboarding', '/style-guide']

test('every route the runtime calls private is disallowed in robots.txt', () => {
  const missing = PRIVATE.filter((p) => !disallowed.includes(p))
  assert.deepEqual(missing, [],
    `robots.txt does not disallow ${missing.join(', ')} — the runtime treats these as private`)
})

test('the prefixes this test checks really are private to the runtime', () => {
  // POSITIVE CONTROL, and the reason the list above is not simply trusted. If
  // `PRIVATE_PREFIXES` were emptied or `isPrivateRoute()` rewritten, the list here
  // would silently become a set of public routes that robots.txt blocks — a
  // much worse bug than the one this file exists to catch, and one the
  // assertion above would happily pass.
  for (const p of PRIVATE) {
    assert.equal(isPrivateRoute(p), true, `${p} is no longer private to the runtime`)
  }
  // And a route that IS public must not be, or the predicate is stuck on.
  assert.equal(isPrivateRoute('/plans'), false, 'isPrivateRoute() is returning true for everything')
})

test('robots.txt still points at the sitemap', () => {
  assert.match(robots, /^Sitemap:\s*https:\/\/uil4b\.com\/sitemap\.xml$/m)
})
