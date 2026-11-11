// How the browser handles each way an animated-icon call can fail, and what it
// keeps in memory for those sets. Behavioural: the client, the loader, the purge
// and the glyph writer are called directly with stubs. The few source assertions
// at the end pin the wiring in IconLibrary.jsx that cannot be imported in node.
// The route itself is animated-icons-endpoint.test.js.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { stripJs as strip } from '../helpers/strip-comments.js'
import { ANIMATED_PACKS } from '../../src/data/iconPackTiers.js'
import {
  createAnimatedIconClient, classifyAnimatedFailure, isAnimatedName, isPackScopedFailure,
} from '../../src/utils/animatedIcons.js'
import {
  applyGlyphData, purgeAnimatedCaches, setAnimatedTier, staleAnimatedAnswer,
} from '../../src/utils/animatedIconCache.js'
import { createCollectionLoader } from '../../src/utils/iconifyCollectionCache.js'

const PAGE = strip(fs.readFileSync('src/pages/IconLibrary.jsx', 'utf8'))

function clientFor({ uid = 'pro-1', getIdToken, respond }) {
  const calls = []
  const user = uid ? { uid, getIdToken: getIdToken || (async () => 'tok') } : null
  const client = createAnimatedIconClient({
    loadAuth: async () => ({ auth: { currentUser: user } }),
    fetchImpl: async (url, init) => { calls.push({ url, init }); return respond(calls.length) },
  })
  return { client, calls }
}
const reply = (status, body = {}) => ({ ok: status >= 200 && status < 300, status, json: async () => body })

// ── Classification ──

test('a 401 refreshes the ID token once and asks again before reporting a session problem', async () => {
  const forced = []
  const { client, calls } = clientFor({
    getIdToken: async (force) => { forced.push(!!force); return force ? 'fresh' : 'stale' },
    respond: (n) => (n === 1 ? reply(401) : reply(200, { icons: {} })),
  })
  await client.glyphs('line-md', ['home'])
  assert.deepEqual(forced, [false, true])
  assert.equal(calls.length, 2)
  assert.equal(calls[0].init.headers.Authorization, 'Bearer stale')
  assert.equal(calls[1].init.headers.Authorization, 'Bearer fresh')
})

test('a 401 that survives the refresh is classified as auth, after exactly two requests', async () => {
  const { client, calls } = clientFor({ respond: () => reply(401) })
  await assert.rejects(client.collection('line-md'), (e) => e.status === 401 && classifyAnimatedFailure(e) === 'auth')
  assert.equal(calls.length, 2, 'one retry, no loop')
})

test('a failed token refresh is classified as auth, and the call makes no request', async () => {
  const { client, calls } = clientFor({
    getIdToken: async () => { throw Object.assign(new Error('expired'), { code: 'auth/user-token-expired' }) },
    respond: () => reply(200),
  })
  await assert.rejects(client.glyphs('line-md', ['home']), (e) => e.tokenFailure === true && classifyAnimatedFailure(e) === 'auth')
  assert.equal(calls.length, 0)
})

test('a token read that fails for lack of a network is offline, not a session problem', async () => {
  const { client } = clientFor({
    getIdToken: async () => { throw Object.assign(new Error('offline'), { code: 'auth/network-request-failed' }) },
    respond: () => reply(200),
  })
  await assert.rejects(client.glyphs('line-md', ['home']), (e) => classifyAnimatedFailure(e) === 'transient')
})

test('403 is forbidden; a 5xx or a thrown fetch is transient; only auth, forbidden and stale are pack-scoped', async () => {
  const forbidden = clientFor({ respond: () => reply(403) })
  await assert.rejects(forbidden.client.glyphs('line-md', ['home']), (e) => classifyAnimatedFailure(e) === 'forbidden')
  assert.equal(forbidden.calls.length, 1, 'a 403 is not retried')

  const down = clientFor({ respond: () => reply(503) })
  await assert.rejects(down.client.glyphs('line-md', ['home']), (e) => classifyAnimatedFailure(e) === 'transient')

  const offline = createAnimatedIconClient({
    loadAuth: async () => ({ auth: { currentUser: { uid: 'u', getIdToken: async () => 'tok' } } }),
    fetchImpl: async () => { throw new TypeError('Failed to fetch') },
  })
  await assert.rejects(offline.glyphs('line-md', ['home']), (e) => classifyAnimatedFailure(e) === 'transient')

  assert.equal(classifyAnimatedFailure(staleAnimatedAnswer()), 'stale')
  assert.equal(classifyAnimatedFailure(undefined), 'transient')
  assert.deepEqual(['auth', 'forbidden', 'stale', 'transient'].map(isPackScopedFailure), [true, true, true, false])
})

test('the client leaves out names the server would refuse, and sends nothing when none are left', async () => {
  const names = ['arrow-up', '90-ring', 'a', 'Arrow', 'arrow up', 'arrow--up', '-up', 'up-', '', 'x'.repeat(65)]
  assert.deepEqual(names.map(isAnimatedName), [true, true, true, false, false, false, false, false, false, false])
  const { client, calls } = clientFor({ respond: () => reply(200, { icons: {} }) })
  await client.glyphs('line-md', ['home', 'Bad Name', 'bars'])
  assert.equal(new URL(calls[0].url, 'https://uil4b.test').searchParams.get('icons'), 'home,bars')
  await client.glyphs('line-md', ['Bad Name'])
  assert.equal(calls.length, 1, 'a batch with no valid name makes no request')
})

// ── The loader's cooldown ──

test('an auth failure does not start the loader cooldown; an outage does', async () => {
  let asked = 0
  const outcomes = []
  const loaderWith = (cooldownExempt) => createCollectionLoader({
    cache: new Map(), storage: () => null, now: () => 1000, cooldownExempt,
    fetchEntry: async () => { asked += 1; throw outcomes.shift() },
  })
  const exempt = (e) => isPackScopedFailure(classifyAnimatedFailure(e))
  const failure = (status) => Object.assign(new Error('x'), { status })

  outcomes.push(failure(401), failure(401))
  const auth = loaderWith(exempt)
  await assert.rejects(auth('line-md'))
  await assert.rejects(auth('line-md'))
  assert.equal(asked, 2, 'the second 401 asked the server again')

  asked = 0
  outcomes.push(failure(503))
  const outage = loaderWith(exempt)
  await assert.rejects(outage('line-md'))
  await assert.rejects(outage('line-md'))
  assert.equal(asked, 1, 'the second call inside the cooldown did not ask')
})

// ── The animated caches ──

function stores() {
  return {
    collections: new Map(), asked: new Map(), retryAfter: new Map(),
    body: new Map(), box: new Map(), uri: new Map(), fails: new Map(), svgText: new Map(), svgReady: new Map(),
    missing: new Set(),
  }
}
const purgeSpec = (c) => ({
  byPack: [c.collections, c.asked, c.retryAfter],
  keyed: [c.body, c.box, c.uri, c.fails, c.missing, c.svgText, c.svgReady],
})
function fill(c, packs) {
  for (const pack of packs) {
    c.collections.set(pack, { names: ['a'] })
    c.asked.set(pack, new Set(['a']))
    c.retryAfter.set(pack, 5)
    for (const store of [c.body, c.box, c.uri, c.fails, c.svgText, c.svgReady]) store.set(`${pack}:a`, 'x')
    c.missing.add(`${pack}:b`)
  }
}
const sizeOf = (c) => Object.values(c).reduce((n, store) => n + store.size, 0)

test('purging empties every animated entry in every store and leaves the other packs alone', () => {
  const c = stores()
  fill(c, [...ANIMATED_PACKS, 'lucide'])
  purgeAnimatedCaches(purgeSpec(c))
  for (const pack of ANIMATED_PACKS) {
    for (const [name, store] of Object.entries(c)) {
      const left = [...store.keys()].filter((k) => k === pack || k.startsWith(`${pack}:`))
      assert.deepEqual(left, [], `${name} still holds ${pack}`)
    }
  }
  assert.equal(sizeOf(c), Object.keys(c).length, 'one lucide entry is left in each store')
  assert.ok(c.body.has('lucide:a') && c.collections.has('lucide') && c.missing.has('lucide:b'))
})

test('switching to free empties the caches, and a late answer does not refill them; on Pro it is stored', () => {
  const data = { icons: { home: { body: '<path/>' } } }
  const c = stores()
  setAnimatedTier('paid')
  fill(c, ANIMATED_PACKS)
  assert.ok(sizeOf(c) > 0)
  setAnimatedTier('free')
  purgeAnimatedCaches(purgeSpec(c))
  assert.equal(sizeOf(c), 0, 'the caches are empty')

  assert.equal(applyGlyphData('line-md', ['home'], data, c), false)
  assert.equal(c.body.size, 0, 'the late answer did not repopulate the store')
  assert.equal(c.missing.size, 0)

  assert.equal(applyGlyphData('lucide', ['home'], data, c), true, 'other packs do not depend on the tier here')
  assert.ok(c.body.has('lucide:home'))

  setAnimatedTier('paid')
  assert.equal(applyGlyphData('line-md', ['home'], data, c), true)
  assert.equal(c.body.get('line-md:home'), '<path/>')
  setAnimatedTier('anon')
})

// ── Wiring in the page (source assertions: the page cannot be imported in node) ──

test('the page purges when the tier leaves Pro, and tells the cache the tier before it browses', () => {
  assert.match(PAGE, /if \(tier !== 'paid'\) forgetAnimatedSets\(\)/)
  const setAt = PAGE.indexOf('setAnimatedTier(tier)')
  assert.ok(setAt > 0 && setAt < PAGE.indexOf('didInit.current = true'), 'the tier is reported above the first browse')
  assert.match(PAGE, /const forgetAnimatedSets = \(\) => purgeAnimatedCaches\(\{[\s\S]*?GLYPH_BODY[\s\S]*?GLYPH_BOX[\s\S]*?GLYPH_URI[\s\S]*?GLYPH_MISSING[\s\S]*?svgTextCache[\s\S]*?svgTextReady/)
})

test('an animated failure never sets the global cdnOk, and the session/plan notices are pack-scoped', () => {
  const browsePack = PAGE.match(/const browsePack = useCallback\([\s\S]*?\n {2}\}, \[renderLocal, browseAll/)[0]
  const handler = browsePack.slice(browsePack.indexOf('.catch('))
  assert.match(handler, /failAnimatedScope\(error\)/)
  assert.match(handler, /if \(!isAnimatedPack\(packFilter\)\) cdnOk\.current = false/)

  const search = PAGE.match(/if \(isAnimatedPack\(packFilter\)\) \{\s*const rid[\s\S]*?\n {6}return\n {4}\}/)[0]
  const searchCatch = search.slice(search.indexOf('.catch('))
  assert.ok(!/cdnOk\.current = false/.test(searchCatch), 'the animated search catch must not touch cdnOk')
  assert.match(searchCatch, /failAnimatedScope\(error\)/)

  // A refusal made up only of animated batches is not the icon service refusing.
  assert.match(PAGE, /const refusing = allRefused && !isRetryRun && !animatedOnly/)
  const scope = PAGE.match(/const failAnimatedScope = useCallback\([\s\S]*?\n {2}\}, \[\]\)/)[0]
  assert.ok(!/setLoadError\(true\)|cdnOk|renderLocal/.test(scope), 'a pack-scoped failure sets no global state and shows no built-in grid')
})

test('the animated search treats spaces as hyphens', () => {
  assert.match(PAGE, /const needle = q\.toLowerCase\(\)\.replace\(\/\\s\+\/g, '-'\)/)
  assert.ok(['arrow-up', 'arrow-up-circle'].every((n) => n.includes('arrow up'.replace(/\s+/g, '-'))))
})
