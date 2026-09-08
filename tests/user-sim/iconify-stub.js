// The Iconify catalogue, served from a committed fixture instead of the live API.
//
// WHAT WAS HAPPENING
// `src/pages/IconLibrary.jsx` fetches the icon catalogue from
// https://api.iconify.design (falling back to api.simplesvg.com and
// api.unisvg.com) on every visit to /create/icons: twenty-five /collection
// requests on first paint, a /search per query, and an .svg per cell. Nothing
// in the suite stood between those requests and the network, so every run made
// a few hundred live third-party round trips. After a day of full-suite runs
// from one machine the API answered 429 Too Many Requests and both fallbacks
// answered 403 with no CORS headers. The grid then filled from whichever packs
// still got through, 25-defect-sweep's pack-label test went red with "one pack
// name under every cell", every /create/icons visit logged ~100 CORS findings,
// and the gate for unrelated PRs was decided by a third party's rate limit.
//
// WHAT THIS DOES
// Installs a `context.route` for the three hosts on every browser context
// (tests/user-sim/base.js wraps `browser.newContext`, the same wrap that covers
// the One Tap stub and the build-asset watch — see the reasoning there for why
// the context and not the page). Each request is answered from
// tests/user-sim/fixtures/iconify/:
//
//   /collections                 collections.json
//   /collection?prefix=<pack>    collection/<pack>.json — every pack the page
//                                requests on first paint has a file
//   /search?query=…&prefix(es)=… search.json, filtered by query and prefix(es)
//                                so a query resolves to a MIXED-pack answer
//   /<pack>/<name>.svg           icon.svg, with the CORS headers the real API
//                                sends (BrandGlyph draws it onto a canvas
//                                through crossOrigin="anonymous"; without the
//                                header every cell is a CORS console error)
//
// Fulfilled, never aborted: an abort is a console error the feedback loop
// reports on every viewport, and the page's own fallback branch is a different
// state from the one being tested. Every stubbed response carries
// ICONIFY_STUB_HEADER so an escape is OBSERVED, not inferred: a response from
// one of these hosts without the header reached the real API. The teardown
// fails the run on one.
//
// THE LIVE API IS STILL REACHABLE, ON PURPOSE
// A fixture cannot tell you the real catalogue changed shape. Set
// UIL4B_LIVE_ICONIFY=1 and nothing here is installed: the page talks to the
// live API, the teardown guard stands down and says so. That is a human
// checking the real thing, never the gate.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { REPORT_DIR } from './helpers.js'

/** The three hosts IconLibrary.jsx tries, in its order. Every path on each is stubbed. */
export const ICONIFY_HOSTS = ['api.iconify.design', 'api.simplesvg.com', 'api.unisvg.com']

/** Stamped onto every stubbed response. A response from these hosts without it reached the network. */
export const ICONIFY_STUB_HEADER = 'x-uil4b-iconify-stub'

/**
 * The header's value on a response a spec refused ON PURPOSE (a page route
 * answering 429/403 to render the failure state). Counted separately from the
 * fixture's own answers and never as an escape.
 */
export const REFUSED_VALUE = 'refused'

/** Set this (to anything non-empty) to bypass the fixture and hit the live API. */
export const LIVE_ICONIFY_ENV = 'UIL4B_LIVE_ICONIFY'

/** Per-run ledger the global teardown asserts on. Written under report/. */
export const ICONIFY_AUDIT_FILE = path.join(REPORT_DIR, 'iconify-audit.jsonl')

/** Where a context's own tally hangs, for the positive-control spec to read. */
const ICONIFY_TALLY = Symbol.for('uil4b.iconifyTally')

export const FIXTURE_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), 'fixtures', 'iconify')

/** True when the run was told to use the live API instead of the fixture. */
export function isLiveIconify(env = process.env) {
  return Boolean(env[LIVE_ICONIFY_ENV])
}

/** True for any URL on one of the three hosts. Takes a string. */
export function isIconifyUrl(url) {
  try { return ICONIFY_HOSTS.includes(new URL(url).hostname) } catch { return false }
}

// Read once per worker. The fixture is small and never changes mid-run.
let fixture = null
function loadFixture() {
  if (fixture) return fixture
  const read = (rel) => fs.readFileSync(path.join(FIXTURE_DIR, rel), 'utf8')
  const collection = new Map()
  for (const f of fs.readdirSync(path.join(FIXTURE_DIR, 'collection'))) {
    if (f.endsWith('.json')) collection.set(f.slice(0, -5), read(path.join('collection', f)))
  }
  fixture = {
    collections: read('collections.json'),
    collection,
    search: JSON.parse(read('search.json')),
    svg: read('icon.svg'),
  }
  return fixture
}

/** The pack prefixes the fixture can answer /collection for. */
export function fixturePacks() {
  return [...loadFixture().collection.keys()].sort()
}

const CORS = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'GET, OPTIONS',
  'cache-control': 'no-store',
  [ICONIFY_STUB_HEADER]: '1',
}

/**
 * The answer for one Iconify URL, as { status, contentType, body }. Pure, so
 * tests/unit/iconify-stub.test.js can pin the routing without a browser.
 */
export function answerIconify(urlString) {
  const fx = loadFixture()
  const url = new URL(urlString)
  const json = (status, body) => ({ status, contentType: 'application/json', body: typeof body === 'string' ? body : JSON.stringify(body) })

  if (url.pathname === '/collections') {
    const only = (url.searchParams.get('prefixes') || '').split(',').filter(Boolean)
    if (!only.length) return json(200, fx.collections)
    const all = JSON.parse(fx.collections)
    return json(200, Object.fromEntries(only.filter((p) => all[p]).map((p) => [p, all[p]])))
  }

  if (url.pathname === '/collection') {
    const body = fx.collection.get(url.searchParams.get('prefix') || '')
    return body ? json(200, body) : json(404, { error: 'not found' })
  }

  if (url.pathname === '/search') {
    const query = (url.searchParams.get('query') || '').trim().toLowerCase()
    const prefixes = (url.searchParams.get('prefix') || url.searchParams.get('prefixes') || '')
      .split(',').map((s) => s.trim()).filter(Boolean)
    const limit = Math.max(1, Number(url.searchParams.get('limit')) || 64)
    const hits = fx.search.icons.filter((id) => {
      const [prefix, name] = id.split(':')
      if (prefixes.length && !prefixes.includes(prefix)) return false
      return !query || name.includes(query)
    })
    return json(200, {
      icons: hits.slice(0, limit), total: hits.length, limit, start: 0, collections: {},
      request: Object.fromEntries(url.searchParams.entries()),
    })
  }

  if (/^\/[^/]+\/[^/]+\.svg$/.test(url.pathname)) {
    return { status: 200, contentType: 'image/svg+xml; charset=utf-8', body: fx.svg }
  }

  return json(404, { error: 'not found' })
}

function appendAudit(entry) {
  try {
    fs.mkdirSync(REPORT_DIR, { recursive: true })
    fs.appendFileSync(ICONIFY_AUDIT_FILE, JSON.stringify(entry) + '\n')
  } catch { /* evidence, never a source of failure itself */ }
}

/**
 * Install the stub on one browser context and start auditing it. Returns the
 * same context, so it can wrap `newContext` transparently. Installs NOTHING
 * when UIL4B_LIVE_ICONIFY is set.
 */
export async function stubIconify(context) {
  if (isLiveIconify()) return context
  const tally = { stubbed: 0, refused: 0, collection: 0, search: 0, svg: 0, missing: [], escaped: [] }
  context[ICONIFY_TALLY] = tally

  await context.route((url) => ICONIFY_HOSTS.includes(url.hostname), (route) => {
    const req = route.request()
    let answer
    try { answer = answerIconify(req.url()) } catch (err) { answer = { status: 500, contentType: 'text/plain', body: String(err) } }
    const pathname = new URL(req.url()).pathname
    if (pathname === '/collection') tally.collection += 1
    else if (pathname === '/search') tally.search += 1
    else if (pathname.endsWith('.svg')) tally.svg += 1
    if (answer.status === 404) tally.missing.push(pathname + new URL(req.url()).search)
    return route.fulfill({ status: answer.status, contentType: answer.contentType, headers: CORS, body: answer.body })
      .catch(() => { /* context torn down mid-flight */ })
  })

  // The hard evidence: a response from these hosts without our header came
  // from the real API. `headers()` is synchronous, so this cannot race a
  // closing context. A page-level route outranks this context route — that is
  // how 66-icon-library-offline-fixture renders the refused state — and it
  // stamps the same header with REFUSED_VALUE, so a deliberate 429 is told
  // apart from a real one by the header, never by the status.
  context.on('response', (res) => {
    if (!isIconifyUrl(res.url())) return
    const stamp = res.headers()[ICONIFY_STUB_HEADER]
    if (stamp === '1') tally.stubbed += 1
    else if (stamp === REFUSED_VALUE) tally.refused += 1
    else tally.escaped.push(`${res.url()} [responded ${res.status()}]`)
  })

  context.on('close', () => appendAudit(tally))
  return context
}

/**
 * What this context asked the fixture for. `{ stubbed, collection, search,
 * svg, missing, escaped }` — `missing` lists requests the fixture had no
 * answer for (404), `escaped` responses that reached the real API. Null when
 * the stub is not installed (live mode).
 */
export function iconifyRequests(context) {
  return context[ICONIFY_TALLY] || null
}

/** Read the per-run ledger. */
export function readIconifyAudit() {
  const empty = { contexts: 0, stubbed: 0, refused: 0, escaped: [], missing: [] }
  if (!fs.existsSync(ICONIFY_AUDIT_FILE)) return empty
  const rows = fs.readFileSync(ICONIFY_AUDIT_FILE, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l))
  return {
    contexts: rows.length,
    stubbed: rows.reduce((n, r) => n + r.stubbed, 0),
    refused: rows.reduce((n, r) => n + (r.refused || 0), 0),
    escaped: rows.flatMap((r) => r.escaped),
    missing: rows.flatMap((r) => r.missing),
  }
}

/**
 * Suite-wide observational guard, run from the global teardown: not one
 * request to an Iconify host reached the network during this run, and every
 * request the page made had an answer in the fixture. Throws — which fails the
 * run — for the same reason assertOneTapNeverLeft does: a stub nothing checks
 * is not evidence. Stands down, and says so, in live mode.
 */
export function assertIconifyNeverLeft() {
  if (isLiveIconify()) {
    console.log(`\n── Iconify ── ${LIVE_ICONIFY_ENV} is set: the LIVE catalogue was used, nothing was stubbed and nothing is asserted about it. ──`)
    return
  }
  const { contexts, stubbed, refused, escaped, missing } = readIconifyAudit()
  if (escaped.length) {
    throw new Error(
      `${escaped.length} request(s) reached an Iconify host during this run — the fixture stub in ` +
      'tests/user-sim/iconify-stub.js did not cover every browser context:\n  ' +
      `${[...new Set(escaped)].join('\n  ')}`,
    )
  }
  const unanswered = [...new Set(missing)]
  if (unanswered.length) {
    throw new Error(
      `${missing.length} Iconify request(s) had no answer in tests/user-sim/fixtures/iconify/ (served 404):\n  ` +
      `${unanswered.slice(0, 12).join('\n  ')}${unanswered.length > 12 ? `\n  ...and ${unanswered.length - 12} more` : ''}` +
      '\n\nThe page asked for something the fixture does not hold. Add it (a pack file under collection/, ' +
      'or a name to search.json) rather than letting the page fall back — a fallback that is only ever ' +
      'seen in the suite is not the product.',
    )
  }
  console.log(
    `\n── Iconify fixture ── ${contexts} context(s) audited, ${stubbed} request(s) served from ` +
    'tests/user-sim/fixtures/iconify' +
    (refused ? `, ${refused} refused on purpose by 66-icon-library-offline-fixture` : '') +
    ', 0 reached the network. ──',
  )
}
