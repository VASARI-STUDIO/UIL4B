// The public GET routes refuse query keys they do not read, and the two that
// were expensive on a cache miss are cheaper.
//
// A shared cache keys a response on the whole query string, so `&x=<random>`
// turns every request into a miss. Each miss on /api/share builds and deflates
// a 1200x630 PNG; on /api/ai?palettePreview it builds a PNG; on /api/fonts it
// downloads and parses the Google catalogue; on /api/get-prices it asks Stripe.
// Each route now answers 400 for a key it does not use.
//
// WHAT KEEPS THIS HONEST. "Refuses unknown keys" is easy to satisfy with a
// route that refuses everything, so each route also has its real callers
// checked: the key sets are read from the source that builds the URLs (src/,
// vercel.json, and the og:image URL the share handler writes into its own
// page), not from a list typed here, and each must be accepted.
//
// Reverting any one of these fails a test below:
//   - the guard in share.js / fonts.js / get-prices.js / preview.js
//   - the `img` value check in share.js
//   - the catalogue cache in fonts.js
//   - the Cache-Control header in get-prices.js
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'

import shareHandler from '../../api/share.js'
import fontsHandler from '../../api/fonts.js'
import pricesHandler from '../../api/get-prices.js'
import { servePalettePreview } from '../../api/_lib/library/preview.js'
import { refuseUnexpectedQuery } from '../../api/_lib/http.js'
import { getStripeServer } from '../../api/_lib/stripe.js'
import { LOOKUP_KEYS, PRICE_ENV_KEYS } from '../../api/_lib/pricing.js'
import { read, stripComments } from './helpers/source-text.js'

process.env.STRIPE_SECRET_KEY = 'sk_test_unit_only_not_a_real_key'

function fakeRes() {
  const res = {
    statusCode: null, body: undefined, sent: undefined, ended: undefined, headers: {},
    setHeader(name, value) { res.headers[name] = value },
    status(code) { res.statusCode = code; return res },
    json(body) { res.body = body; return res },
    send(body) { res.sent = body; return res },
    end(body) { res.ended = body; return res },
  }
  return res
}

/** Every `?a=1&b=2` key in a URL string, with `${...}` holes ignored. */
const queryKeys = (url) => [...String(url).matchAll(/[?&]([A-Za-z_][\w-]*)=/g)].map((m) => m[1])

function sourceFiles(dir) {
  const out = []
  for (const e of fs.readdirSync(path.join(process.cwd(), dir), { withFileTypes: true })) {
    const rel = `${dir}/${e.name}`
    if (e.isDirectory()) out.push(...sourceFiles(rel))
    else if (/\.(js|jsx|mjs)$/.test(e.name)) out.push(rel)
  }
  return out
}

/** Every URL literal in src/ (comments stripped) that starts with `prefix`, as { file, url }. */
function callersOf(prefix) {
  const found = []
  const re = new RegExp(`${prefix.replace(/[/?]/g, '\\$&')}[^'"\`\\s)]*`, 'g')
  for (const file of sourceFiles('src')) {
    for (const m of stripComments(read(file)).matchAll(re)) found.push({ file, url: m[0] })
  }
  return found
}

// ── The shared guard ────────────────────────────────────────────────────────

test('the guard refuses a key outside the allow-list, a repeated key, and nothing else', () => {
  const ask = (query, allowed) => {
    const res = fakeRes()
    const refused = refuseUnexpectedQuery({ query }, res, allowed)
    return { refused, res }
  }
  assert.equal(ask({ c: 'a' }, ['c']).refused, false)
  assert.equal(ask({}, []).refused, false)
  assert.equal(ask(undefined, []).refused, false)

  const unknown = ask({ c: 'a', x: '1' }, ['c'])
  assert.equal(unknown.refused, true)
  assert.equal(unknown.res.statusCode, 400)
  assert.equal(unknown.res.headers['Cache-Control'], 'no-store', 'a refusal must not be cached')

  assert.equal(ask({ c: ['a', 'b'] }, ['c']).refused, true, 'a repeated key is a second spelling of one request')
})

// ── /api/share ───────────────────────────────────────────────────────────────

const CODE = '4338E0,7C6CF0'

test('share: an unknown query key is a 400 and builds nothing', () => {
  for (const query of [{ c: CODE, x: '1' }, { c: CODE, img: '1', cb: 'abc' }, { c: CODE, utm_source: 'a' }]) {
    const res = fakeRes()
    shareHandler({ method: 'GET', query, headers: {} }, res)
    assert.equal(res.statusCode, 400, JSON.stringify(query))
    assert.equal(res.sent, undefined, 'a refused request still produced a document')
    assert.equal(res.headers['Cache-Control'], 'no-store')
  }
})

test('share: img has one legal value, because every other value is another cache entry for the same PNG', () => {
  for (const img of ['2', '0', 'true', '', ['1', '1']]) {
    const res = fakeRes()
    shareHandler({ method: 'GET', query: { c: CODE, img }, headers: {} }, res)
    assert.equal(res.statusCode, 400, `img=${JSON.stringify(img)}`)
  }
})

test('share: a repeated c is refused, not read as a comma list', () => {
  const res = fakeRes()
  shareHandler({ method: 'GET', query: { c: ['4338E0', '7C6CF0'] }, headers: {} }, res)
  assert.equal(res.statusCode, 400)
})

test('share: the /p/:code rewrite and the og:image URL the page writes are both accepted', () => {
  // The rewrite in vercel.json is the real caller of the page.
  const rewrite = JSON.parse(read('vercel.json')).rewrites.find((r) => r.source === '/p/:code')
  assert.ok(rewrite, 'the /p/:code rewrite is gone; update this test')
  const rewriteKeys = queryKeys(rewrite.destination)
  assert.deepEqual(rewriteKeys, ['c'])

  const page = fakeRes()
  shareHandler({ method: 'GET', query: Object.fromEntries(rewriteKeys.map((k) => [k, CODE])), headers: {} }, page)
  assert.equal(page.statusCode, 200, 'the page the rewrite produces was refused')
  assert.match(page.headers['Content-Type'], /text\/html/)

  // The second real caller: the og:image URL inside that page.
  const imgUrl = /property="og:image" content="([^"]+)"/.exec(page.sent)[1]
  const params = Object.fromEntries(new URL(imgUrl).searchParams)
  assert.deepEqual(Object.keys(params).sort(), ['c', 'img'])
  const image = fakeRes()
  shareHandler({ method: 'GET', query: params, headers: {} }, image)
  assert.equal(image.statusCode, 200, 'the og:image URL the page writes was refused')
  assert.equal(image.headers['Content-Type'], 'image/png')
  assert.ok(Buffer.isBuffer(image.sent) && image.sent.subarray(1, 4).toString() === 'PNG')
})

test('share: the palette builder only ever builds /p/<code> links, never a query string', () => {
  const src = stripComments(read('src/pages/PaletteBuilder.jsx'))
  const link = /const shareLink = \(\) => `([^`]+)`/.exec(src)
  assert.ok(link, 'shareLink moved; update this test')
  assert.ok(link[1].includes('/p/') && !link[1].includes('?'), `the share link carries a query string: ${link[1]}`)
})

// ── /api/ai?palettePreview ───────────────────────────────────────────────────

const ROWS = [{ id: 'teal-dusk', name: 'Teal Dusk', colors: ['#0B2A45', '#F2A488', '#C9F24D', '#4B1F9E'] }]

test('palettePreview: an extra query key is a 400, not a second PNG build', () => {
  const res = fakeRes()
  servePalettePreview({ query: { palettePreview: 'teal-dusk', x: '1' } }, res, ROWS)
  assert.equal(res.statusCode, 400)
  assert.equal(res.ended, undefined, 'a PNG was built for a request with an unknown key')
})

test('palettePreview: the URL the Discover card builds is accepted', () => {
  const callers = callersOf('/api/ai?palettePreview').filter((c) => c.file.endsWith('DiscoverPicks.jsx'))
  assert.ok(callers.length >= 1, 'the Discover card no longer builds a palettePreview URL; update this test')
  for (const { url } of callers) {
    assert.deepEqual(queryKeys(url), ['palettePreview'], `${url} carries more than the id`)
    const res = fakeRes()
    servePalettePreview({ query: { palettePreview: 'teal-dusk' } }, res, ROWS)
    assert.equal(res.statusCode, 200)
    assert.equal(res.headers['Content-Type'], 'image/png')
  }
  // Every other caller in src/ builds the same single-key URL.
  for (const { file, url } of callersOf('/api/ai?palettePreview')) {
    assert.deepEqual(queryKeys(url), ['palettePreview'], `${file}: ${url}`)
  }
})

// ── /api/fonts ───────────────────────────────────────────────────────────────

const TWO_HOURS = 2 * 60 * 60 * 1000
let clock = 1_900_000_000_000

/** Replaces fetch and the clock for one test, and counts upstream calls. */
function fontsSetup(t, { fail = false } = {}) {
  clock += TWO_HOURS
  t.mock.method(Date, 'now', () => clock)
  t.mock.method(console, 'error', () => {})
  const urls = []
  const realFetch = global.fetch
  global.fetch = async (url) => {
    urls.push(String(url))
    if (fail) return { ok: false, status: 503, statusText: 'Service Unavailable', json: async () => ({}), text: async () => '' }
    return {
      ok: true, status: 200, statusText: 'OK',
      text: async () => ")]}'" + JSON.stringify({
        familyMetadataList: [{ family: 'Inter', category: 'Sans Serif', popularity: 1, fonts: { 400: {}, 700: {} } }],
      }),
    }
  }
  t.after(() => { global.fetch = realFetch })
  return urls
}

const getFonts = async (query) => {
  const res = fakeRes()
  await fontsHandler({ method: 'GET', query }, res)
  return res
}

test('fonts: an unknown query key is a 400 and reaches no upstream', async (t) => {
  const urls = fontsSetup(t)
  const res = await getFonts({ cb: 'abc123' })
  assert.equal(res.statusCode, 400)
  assert.deepEqual(urls, [], 'a refused request still fetched the catalogue')
})

test('fonts: the catalogue is fetched once across two calls inside the hour', async (t) => {
  const urls = fontsSetup(t)
  const first = await getFonts({})
  clock += 59 * 60 * 1000
  const second = await getFonts({})
  assert.equal(first.statusCode, 200)
  assert.equal(second.statusCode, 200)
  assert.equal(urls.length, 1, `the catalogue was fetched ${urls.length} times for two calls within an hour`)
  assert.deepEqual(second.body, first.body, 'the cached answer differs from the fetched one')
  assert.ok(second.body.fonts.length > 0)
})

test('fonts: after the hour it is fetched again', async (t) => {
  const urls = fontsSetup(t)
  await getFonts({})
  clock += 61 * 60 * 1000
  await getFonts({})
  assert.equal(urls.length, 2, 'the cache never expires')
})

test('fonts: a failed fetch is not cached', async (t) => {
  const urls = fontsSetup(t, { fail: true })
  const failed = await getFonts({})
  assert.equal(failed.statusCode, 502)
  const afterFailure = urls.length
  // Upstream recovers inside the hour: the next call must ask again.
  global.fetch = async (url) => {
    urls.push(String(url))
    return {
      ok: true, status: 200, statusText: 'OK',
      text: async () => ")]}'" + JSON.stringify({
        familyMetadataList: [{ family: 'Inter', category: 'Sans Serif', popularity: 1, fonts: { 400: {} } }],
      }),
    }
  }
  clock += 60 * 1000
  const recovered = await getFonts({})
  assert.equal(recovered.statusCode, 200)
  assert.ok(urls.length > afterFailure, 'a failed catalogue was remembered for the hour')
})

test('fonts: the only caller in src/ asks for the bare URL', () => {
  const callers = callersOf('/api/fonts')
  assert.ok(callers.length >= 1, 'no caller of /api/fonts found in src/; update this test')
  for (const { file, url } of callers) assert.deepEqual(queryKeys(url), [], `${file}: ${url}`)
})

// ── /api/get-prices ──────────────────────────────────────────────────────────

const TEN_MINUTES = 10 * 60 * 1000
let priceClock = 1_800_000_000_000

const price = (id, interval, amount) => ({
  id, active: true, currency: 'usd', unit_amount: amount, currency_options: {},
  recurring: { interval, interval_count: 1 },
})

/** Stubs the real Stripe client. `live: false` makes every lookup come back empty. */
function pricesSetup(t, { live = true } = {}) {
  priceClock += TEN_MINUTES
  t.mock.method(Date, 'now', () => priceClock)
  t.mock.method(console, 'warn', () => {})
  t.mock.method(console, 'error', () => {})
  const saved = {}
  for (const key of Object.values(PRICE_ENV_KEYS)) { saved[key] = process.env[key]; delete process.env[key] }
  t.after(() => {
    for (const [key, value] of Object.entries(saved)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value
    }
  })
  const calls = { list: 0 }
  const stripe = getStripeServer()
  t.mock.method(stripe.prices, 'retrieve', async () => { throw new Error('unused') })
  t.mock.method(stripe.prices, 'list', async (params) => {
    calls.list++
    if (!live) return { data: [] }
    const key = params.lookup_keys[0]
    return { data: [key === LOOKUP_KEYS.yearly ? price('price_y', 'year', 6000) : price('price_m', 'month', 900)] }
  })
  return calls
}

const getPrices = async (query = {}, headers = {}) => {
  const res = fakeRes()
  await pricesHandler({ method: 'GET', headers, query }, res)
  return res
}

test('get-prices: an unknown query key is a 400 and asks Stripe nothing', async (t) => {
  const calls = pricesSetup(t)
  const res = await getPrices({ nocache: Math.random().toString(36) })
  assert.equal(res.statusCode, 400)
  assert.equal(calls.list, 0, 'a refused request still reached Stripe')
})

test('get-prices: a live answer is cacheable by a shared cache for about five minutes', async (t) => {
  pricesSetup(t)
  const res = await getPrices()
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.source.monthly, 'live', 'the stub did not produce a live answer, so this proves nothing')
  const cc = res.headers['Cache-Control']
  assert.ok(cc, 'get-prices sets no Cache-Control')
  assert.match(cc, /\bpublic\b/)
  assert.match(cc, /s-maxage=300\b/)
  assert.match(cc, /stale-while-revalidate=\d+/)
})

test('get-prices: a fallback table is cached only briefly, so a recovered Stripe is not hidden', async (t) => {
  pricesSetup(t, { live: false })
  const res = await getPrices()
  assert.equal(res.statusCode, 200)
  assert.equal(res.body.source.monthly, 'fallback')
  const cc = res.headers['Cache-Control']
  assert.match(cc, /s-maxage=\d+/)
  assert.ok(Number(/s-maxage=(\d+)/.exec(cc)[1]) <= 60, `a fallback table is cached for ${cc}`)
})

test('get-prices: Vary: Origin is always set, so a cached copy never loses its CORS header for an allowed origin', async (t) => {
  pricesSetup(t)
  const without = await getPrices({}, {})
  assert.equal(without.headers.Vary, 'Origin')
  assert.equal(without.headers['Access-Control-Allow-Origin'], undefined)
  const withOrigin = await getPrices({}, { origin: 'https://uil4b.com' })
  assert.equal(withOrigin.headers.Vary, 'Origin')
  assert.equal(withOrigin.headers['Access-Control-Allow-Origin'], 'https://uil4b.com')
})

test('get-prices: the only caller in src/ asks for the bare URL', () => {
  const callers = callersOf('/api/get-prices')
  assert.ok(callers.length >= 1, 'no caller of /api/get-prices found in src/; update this test')
  for (const { file, url } of callers) assert.deepEqual(queryKeys(url), [], `${file}: ${url}`)
})
