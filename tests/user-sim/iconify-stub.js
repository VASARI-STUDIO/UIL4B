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
// still got through, 25-layout-target-sweep's pack-label test went red with "one pack
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
//   /<pack>.json?icons=a,b,c     one { body } per requested name, from the same
//                                icon.svg — THE ENDPOINT THE GRID NOW USES.
//                                One request per pack replaced one per cell.
//   /<pack>/<name>.svg           icon.svg, with the CORS headers the real API
//                                sends. Still served: the customizer fetches a
//                                glyph's own markup this way. The grid no
//                                longer does, so this is no longer the path
//                                that decides whether cells paint.
//
// The page also reads each pack's list from its own site first
// (/iconify/collections/<pack>.json, committed under public/iconify/), so the
// same collection/<pack>.json fixtures answer THAT path too. It is counted as
// `snapshot` and never as `collection`: a `collection` request is one that
// reached the Iconify host, which a first visit no longer sends.
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

/**
 * Answer every Iconify host on this PAGE the way the network did on
 * 2026-09-08 — 429 from api.iconify.design, 403 from both fallbacks —
 * fulfilled, never aborted, and stamped REFUSED_VALUE so the context's audit
 * counts it as a deliberate refusal. A page route outranks the context
 * route, which is how the refused state is rendered over the fixture. Call
 * it before go(); page.unrouteAll() hands the page back to the fixture.
 *
 * Shared from here rather than copied into each spec on purpose: the unit
 * guard forbids a spec naming one of these hosts, and it is right to — a
 * per-spec route that drifted from this one would refuse differently from
 * the outage it reproduces. 66-icon-library-offline-fixture is the guard's
 * one named exemption and keeps its own copy as the documented original.
 */
export async function refuseIconify(page) {
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route((u) => u.hostname === ICONIFY_HOSTS[0],
    (route) => route.fulfill({ status: 429, contentType: 'text/plain', headers, body: 'Too Many Requests' }))
  await page.route((u) => ICONIFY_HOSTS.slice(1).includes(u.hostname),
    (route) => route.fulfill({ status: 403, contentType: 'text/plain', headers, body: 'Forbidden' }))
  // The site's own pack lists are part of the catalogue: leaving them answering
  // would render a healthy page over a refused service.
  await page.route((u) => SNAPSHOT_PATH_RE.test(u.pathname),
    (route) => route.fulfill({ status: 404, contentType: 'text/plain', headers, body: 'Not found' }))
}

/**
 * Take the site's own pack lists away (a 404 for every /iconify/collections/<pack>.json)
 * and leave Iconify itself answering from the fixture. This is a pack with no
 * usable snapshot: the page must fall back to the live /collection request,
 * which the stub then counts as `collection`. Call it before go(); a page route
 * outranks the context route, and page.unrouteAll() puts the snapshots back.
 *
 * Stamped REFUSED_VALUE like the other refusals so the context audit reads it
 * as deliberate. The 404s are same-origin, so they are not an Iconify escape.
 */
export async function withholdSnapshots(page) {
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route((u) => SNAPSHOT_PATH_RE.test(u.pathname),
    (route) => route.fulfill({ status: 404, contentType: 'text/plain', headers, body: 'Not found' }))
}

/**
 * Refuse ONLY the individual glyph .svg requests, and let the catalogue
 * (collections.json, collection/<pack>.json, search) answer normally from the
 * fixture.
 *
 * This is a different outage from refuseIconify above, and the difference is
 * the whole point. On 2026-09-15 the founder reported the icon library broken;
 * measured, all 24 catalogue requests returned 200 while every glyph came back
 * 429 from Cloudflare (error 1015, rate limited per IP). The API answers a
 * rate-limited glyph with text/plain, the browser had asked for an image, so
 * ORB blocks it and the <img> simply fails.
 *
 * The refused-state built for the 2026-09-08 outage could not see it: that one
 * keys on the CATALOGUE failing, so with the catalogue healthy the app
 * reported "Live library connected" over 120 blank cells.
 */
export async function refuseIconifyGlyphs(page) {
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route(
    // BOTH SHAPES OF "A GLYPH", or this helper stops refusing anything.
    // It used to match `.svg` alone, because a cell was one .svg request. The
    // grid now takes its markup from the batched /{prefix}.json?icons=… instead
    // (see IconLibrary.jsx), so `.svg` alone would leave the batches answering
    // 200 from the fixture and this "outage" would quietly test a healthy page.
    // The catalogue — /collections, /collection, /search — still answers, which
    // is what makes this the 2026-09-15 failure rather than the 2026-09-08 one.
    (u) => ICONIFY_HOSTS.includes(u.hostname)
      && (u.pathname.endsWith('.svg') || (/^\/[^/]+\.json$/.test(u.pathname) && u.search.includes('icons='))),
    (route) => route.fulfill({
      status: 429, contentType: 'text/plain', headers, body: 'Too Many Requests',
    }),
  )
}
/**
 * True for a request the /collection rate limit refuses: the listing endpoint
 * for any prefix not named in `except`. /collections (plural), /search and the
 * batched glyph endpoint are NOT matched; those stay answerable under it.
 */
export function refusesCollection(url, except = []) {
  return ICONIFY_HOSTS[0] === url.hostname && url.pathname === '/collection'
    && !except.includes(url.searchParams.get('prefix'))
}

/**
 * Refuse ONLY /collection on this PAGE, the way api.iconify.design did when a
 * visit's burst of listing requests tripped Cloudflare's per-IP limit (error
 * 1015): 429 on /collection for every prefix, while /collections, /search and
 * /{prefix}.json?icons= kept answering 200. Like the other refusals it carries
 * no CORS headers, so the browser sees a network error, which is also what a
 * real 1015 looks like to a page. `except` lists prefixes that still answer
 * (they fall through to the fixture). Call before go().
 */
export async function refuseIconifyCollections(page, { except = [] } = {}) {
  const headers = { [ICONIFY_STUB_HEADER]: REFUSED_VALUE }
  await page.route((u) => refusesCollection(u, except),
    (route) => route.fulfill({ status: 429, contentType: 'text/plain', headers, body: 'error code: 1015' }))
}

const HEADS_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'src', 'data', 'iconHeads')

/** The packs that have a committed head file (src/data/iconHeads/<pack>.json). */
export function headPackNames() {
  return fs.readdirSync(HEADS_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
}

/**
 * The pack a request for a pack's head file is about, or null for any other URL.
 * The built site serves each head as its own chunk, /assets/<pack>-<8-character
 * hash>.js; the dev server serves /src/data/iconHeads/<pack>.json. Pure, so the
 * unit tests can pin it without a browser.
 */
export function headPackOfUrl(urlString, packs = headPackNames()) {
  let pathname
  try { pathname = new URL(urlString).pathname } catch { return null }
  const built = pathname.match(/^\/assets\/(.+)-[\w-]{8}\.js$/)
  if (built && packs.includes(built[1])) return built[1]
  const dev = pathname.match(/^\/src\/data\/iconHeads\/([^/]+)\.json$/)
  return dev && packs.includes(dev[1]) ? dev[1] : null
}

/**
 * Hold the requests the default "All packs" listing now waits on: the packs'
 * head files, which name the icons before any glyph is fetched. Nothing is
 * answered until `release()`; `delay(pack)` may return a further wait (ms) for
 * one pack once released. `requested` lists the packs asked for, in order, so a
 * spec can prove the hold caught something. Call before go().
 */
export async function holdIconHeads(page, { delay = () => 0 } = {}) {
  let release
  const held = new Promise((resolve) => { release = resolve })
  const state = { requested: [], answered: [], release }
  await page.route((u) => headPackOfUrl(u.href) !== null, async (route) => {
    const pack = headPackOfUrl(route.request().url())
    state.requested.push(pack)
    await held
    const wait = delay(pack)
    if (wait > 0) await new Promise((resolve) => setTimeout(resolve, wait))
    state.answered.push(pack)
    await route.fallback().catch(() => { /* page closed while held */ })
  })
  return state
}

/**
 * Let `after` Iconify requests through to the fixture, then answer every one
 * after that with 429 and a Retry-After, the way the live API did when one IP
 * reloaded /create/icons a couple of times (3555 seconds, measured). Stamped
 * REFUSED_VALUE so the audit counts it as deliberate.
 *
 * Returns a live ledger — `{ served, refused, urls }` — because the page route
 * outranks the context route, so the context tally no longer sees these
 * requests: this ledger is the count "at the stub" for anything after the call.
 * Read it with a before/after difference.
 *
 * `expose` adds Access-Control-Expose-Headers: retry-after, which the real API
 * does not send; without it the page cannot read the header and must fall back
 * to its own default cool-down. Both shapes are worth a test.
 */
export async function limitIconify(page, { after = 0, retryAfter = 3555, expose = false } = {}) {
  const ledger = { served: 0, refused: 0, urls: [] }
  await page.route((u) => ICONIFY_HOSTS.includes(u.hostname), (route) => {
    const url = route.request().url()
    ledger.urls.push(url)
    if (ledger.urls.length <= after) {
      ledger.served += 1
      const answer = answerIconify(url)
      return route.fulfill({ status: answer.status, contentType: answer.contentType, headers: CORS, body: answer.body })
        .catch(() => { /* context torn down mid-flight */ })
    }
    ledger.refused += 1
    return route.fulfill({
      status: 429,
      contentType: 'text/plain',
      headers: {
        [ICONIFY_STUB_HEADER]: REFUSED_VALUE,
        'access-control-allow-origin': '*',
        'retry-after': String(retryAfter),
        ...(expose ? { 'access-control-expose-headers': 'retry-after' } : {}),
      },
      body: 'Too Many Requests',
    }).catch(() => { /* context torn down mid-flight */ })
  })
  return ledger
}

/**
 * The page's own copy of a pack list, which it asks for before it asks Iconify.
 * Matches the path on whatever origin the app is served from.
 */
export const SNAPSHOT_PATH_RE = /^\/iconify\/collections\/([^/]+)\.json$/

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
  const svg = read('icon.svg')
  fixture = {
    collections: read('collections.json'),
    collection,
    search: JSON.parse(read('search.json')),
    svg,
    // The same artwork as a BODY — the markup inside the <svg> root, which is
    // the shape the real API's /{prefix}.json?icons=… returns per icon. Derived
    // from the one fixture file rather than committed twice, so the batched and
    // per-icon endpoints can never drift apart.
    svgBody: svg.replace(/^[\s\S]*?<svg[^>]*>/, '').replace(/<\/svg>\s*$/, ''),
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

  // /{prefix}.json?icons=a,b,c — the BATCHED glyph endpoint, which is how the
  // grid gets its markup now. One request per pack replaced one per cell (120
  // on first paint); the reasoning is in IconLibrary.jsx. Answering it here is
  // not optional: without it the page's batches 404, every grid cell stays
  // empty and the suite silently tests the built-in fallback instead of the
  // product.
  //
  // Only a pack the fixture actually carries is answered, exactly as
  // /collection does — a request for a pack with no fixture file must stay
  // visible as a 404 rather than be invented.
  const batch = url.pathname.match(/^\/([^/]+)\.json$/)
  if (batch && url.searchParams.has('icons')) {
    const prefix = batch[1]
    if (!fx.collection.has(prefix)) return json(404, { error: 'not found' })
    const names = (url.searchParams.get('icons') || '').split(',').map((s) => s.trim()).filter(Boolean)
    const icons = {}
    for (const n of names) icons[n] = { body: fx.svgBody }
    // `width`/`height` are the pack defaults the real API sends at the top
    // level, and `aliases` is present-but-empty on purpose: the page walks an
    // alias chain, and an absent key must not be the only reason that path is
    // never exercised.
    return json(200, { prefix, width: 24, height: 24, icons, aliases: {} })
  }

  if (/^\/[^/]+\/[^/]+\.svg$/.test(url.pathname)) {
    return { status: 200, contentType: 'image/svg+xml; charset=utf-8', body: fx.svg }
  }

  return json(404, { error: 'not found' })
}

/**
 * The folder the build copies the site's own pack lists from. The fixture holds
 * a pack list for more packs than the site commits (fluent-emoji has none), and
 * the real site answers those with a 404 so the page goes on to the live
 * /collection request. Reading the folder, not the fixture, keeps the stub from
 * answering a list the product never serves, which would hide that live request
 * from every count.
 */
export const SNAPSHOT_DIR = path.join(path.dirname(fileURLToPath(import.meta.url)), '..', '..', 'public', 'iconify', 'collections')

/** The packs the site serves a list for, sorted. */
export function snapshotPacks() {
  return fs.readdirSync(SNAPSHOT_DIR).filter((f) => f.endsWith('.json')).map((f) => f.slice(0, -5)).sort()
}

/**
 * The answer for one same-origin pack list, as { status, contentType, body }:
 * the pack's fixture body when the site commits a snapshot file for it, or a
 * 404 for any other pack, which is what sends the page on to the Iconify host
 * (where the live request is counted).
 */
export function answerSnapshot(pathname) {
  const pack = pathname.match(SNAPSHOT_PATH_RE)?.[1]
  const name = pack && decodeURIComponent(pack)
  const body = name && snapshotPacks().includes(name) && loadFixture().collection.get(name)
  return body
    ? { status: 200, contentType: 'application/json', body }
    : { status: 404, contentType: 'application/json', body: JSON.stringify({ error: 'not found' }) }
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
  // `batch` counts /{prefix}.json?icons=… — how the GRID gets its markup now.
  // `svg` stays and still counts the per-icon endpoint, which the customizer
  // uses; the two are separate because "the grid drew its icons" and "a glyph's
  // own markup was fetched" stopped being the same question when the grid
  // started batching.
  const tally = { stubbed: 0, refused: 0, collection: 0, snapshot: 0, search: 0, svg: 0, batch: 0, missing: [], escaped: [] }
  context[ICONIFY_TALLY] = tally

  await context.route((url) => ICONIFY_HOSTS.includes(url.hostname), (route) => {
    const req = route.request()
    let answer
    try { answer = answerIconify(req.url()) } catch (err) { answer = { status: 500, contentType: 'text/plain', body: String(err) } }
    const pathname = new URL(req.url()).pathname
    if (pathname === '/collection') tally.collection += 1
    else if (pathname === '/search') tally.search += 1
    else if (pathname.endsWith('.svg')) tally.svg += 1
    else if (/^\/[^/]+\.json$/.test(pathname) && new URL(req.url()).search.includes('icons=')) tally.batch += 1
    if (answer.status === 404) tally.missing.push(pathname + new URL(req.url()).search)
    return route.fulfill({ status: answer.status, contentType: answer.contentType, headers: CORS, body: answer.body })
      .catch(() => { /* context torn down mid-flight */ })
  })

  // The site's own pack lists. Not an Iconify host, so outside the escape audit;
  // `snapshot` counts them so a spec can tell "read from this site" from "asked
  // Iconify".
  await context.route((url) => SNAPSHOT_PATH_RE.test(url.pathname), (route) => {
    tally.snapshot += 1
    const answer = answerSnapshot(new URL(route.request().url()).pathname)
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
