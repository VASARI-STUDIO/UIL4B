// The browser's side of the animated icon sets: they are paid and flagged in the
// tier table, the free and signed-out tiers cannot see them, and the page never
// builds a direct api.iconify.design request for one. The server half is
// animated-icons-endpoint.test.js.
//
// Source assertions are comment-blind (tests/helpers/strip-comments.js): the
// prose in IconLibrary.jsx quotes the very strings under test.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import { stripJs as strip } from '../helpers/strip-comments.js'
import {
  ANIMATED_PACKS, ICON_PACK_TIERS, canSeePack, isAnimatedPack, visiblePacks,
} from '../../src/data/iconPackTiers.js'
import { ICON_PACK_CREDITS } from '../../src/data/iconPackCredits.js'
import { glyphRequestPlan } from '../../src/data/iconGroups.js'
import { loadGroupGlyphs, resetGroupGlyphs } from '../../src/utils/iconGroupGlyphs.js'
import { createAnimatedIconClient, ANIMATED_BATCH } from '../../src/utils/animatedIcons.js'

const PAGE = strip(fs.readFileSync('src/pages/IconLibrary.jsx', 'utf8'))

test('line-md, svg-spinners and meteocons are the animated sets, paid, flagged, MIT-credited', () => {
  assert.deepEqual([...ANIMATED_PACKS].sort(), ['line-md', 'meteocons', 'svg-spinners'])
  for (const prefix of ANIMATED_PACKS) {
    assert.equal(ICON_PACK_TIERS[prefix].tier, 'paid', `${prefix} must be Pro only`)
    assert.equal(ICON_PACK_TIERS[prefix].animated, true)
    assert.equal(isAnimatedPack(prefix), true)
    assert.equal(ICON_PACK_CREDITS[prefix].spdx, 'MIT', `${prefix} is credited under the licence Iconify publishes`)
  }
  for (const prefix of ['lucide', 'simple-icons', 'no-such-pack', 'constructor', '__proto__', '']) {
    assert.equal(isAnimatedPack(prefix), false, prefix)
  }
})

test('signed-out and Free viewers cannot see an animated set; Pro can', () => {
  for (const prefix of ANIMATED_PACKS) {
    assert.equal(canSeePack(prefix, 'anon'), false, `${prefix} signed out`)
    assert.equal(canSeePack(prefix, 'free'), false, `${prefix} on a Free account`)
    assert.equal(canSeePack(prefix, 'paid'), true, `${prefix} on Pro`)
  }
  for (const tier of ['anon', 'free']) {
    assert.deepEqual(visiblePacks([...ANIMATED_PACKS], tier), [], `${tier} is offered no animated set`)
  }
})

test('the animated sets are in the pack menu, and in none of the default or group aggregates', () => {
  const menu = PAGE.match(/const PACK_MENU = \[[\s\S]*?\n\]/)[0]
  for (const prefix of ANIMATED_PACKS) {
    assert.ok(menu.includes(`'${prefix}'`), `${prefix} is missing from the pack menu, so Pro cannot reach it`)
  }
  const interfacePacks = PAGE.match(/const INTERFACE_PACKS = \[[^\]]*\]/)[0]
  const groups = PAGE.match(/const ICON_GROUPS = \{[\s\S]*?\n\}/)[0]
  for (const prefix of ANIMATED_PACKS) {
    assert.ok(!interfacePacks.includes(`'${prefix}'`), `${prefix} would load in the All packs grid`)
    assert.ok(!groups.includes(`'${prefix}'`), `${prefix} would load through a group`)
  }
})

test('the page never builds a direct Iconify request for an animated set', () => {
  // The URL builder returns nothing for an animated prefix, before it composes anything.
  assert.match(PAGE, /function buildSvgUrl\([^)]*\) \{\s*if \(isAnimatedPack\(pack\)\) return ''/)

  // The batched glyph loader sends an animated prefix to the server client and only
  // builds the Iconify URL in the other branch.
  const loader = PAGE.match(/async function loadGlyphBatch\([\s\S]*?\n\}/)[0]
  const animatedAt = loader.indexOf('animatedIcons.glyphs(')
  const directAt = loader.indexOf('API_HOSTS[0]')
  assert.ok(animatedAt > 0 && directAt > 0, 'both branches are present')
  assert.match(loader, /if \(isAnimatedPack\(pack\)\) \{\s*data = await animatedIcons\.glyphs\(/)
  assert.ok(animatedAt < directAt, 'the animated branch must come before the direct URL is built')

  // The single-icon fetch, the collection listing and the hover prefetch each branch away too.
  const svgText = PAGE.match(/function fetchSvgText\([\s\S]*?\n\}/)[0]
  assert.ok(svgText.indexOf('isAnimatedPack(pack)') > 0 && svgText.indexOf('isAnimatedPack(pack)') < svgText.indexOf('API_HOSTS'))
  assert.match(PAGE, /isAnimatedPack\(pack\) \? getAnimatedCollectionNames\(pack, options\) : getPublicCollectionNames\(pack, options\)/)
  assert.match(PAGE, /!isAnimatedPack\(icon\.pack\)\) fetchSvgText/)

  // The /search endpoint is never given an animated prefix: a scoped search reads the
  // server-listed names, and an unscoped Pro search drops animated hits.
  assert.match(PAGE, /if \(isAnimatedPack\(packFilter\)\) \{[\s\S]*?getCollectionNames\(packFilter\)[\s\S]*?return\n\s*\}/)
  assert.match(PAGE, /\.filter\(ic => !isAnimatedPack\(ic\.pack\)\)/)

  // The collection cache for these sets never touches localStorage.
  assert.match(PAGE, /getAnimatedCollectionNames = createCollectionLoader\(\{[\s\S]*?storage: \(\) => null/)

  // The only call that names the Iconify host from this page is the direct branch.
  const directCalls = [...PAGE.matchAll(/API_HOSTS\[0\]/g)].length
  assert.ok(directCalls >= 1)
})

test('the groups page cannot fetch an animated glyph from Iconify either', async () => {
  const fake = {
    id: 'g', access: 'paid',
    icons: ['lucide:home', 'line-md:loading-loop', 'meteocons:clear-day'],
  }
  const plan = glyphRequestPlan([fake], 'paid')
  assert.deepEqual([...plan.keys()], ['lucide'], 'animated prefixes are left out of the request plan')

  resetGroupGlyphs()
  let called = 0
  const ok = await loadGroupGlyphs(new Map([['line-md', ['loading-loop']]]), {
    fetchImpl: async () => { called += 1; return { ok: true, json: async () => ({}) } },
  })
  assert.equal(called, 0, 'a batch for an animated prefix makes no request')
  assert.equal(ok, false)
  resetGroupGlyphs()
})

function authStub(uid) {
  const state = { tokenCalls: 0 }
  const user = uid ? { uid, getIdToken: async () => { state.tokenCalls += 1; return `token-of-${uid}` } } : null
  state.loadAuth = async () => ({ auth: { currentUser: user } })
  return state
}

test('the client asks the server route with the account\'s ID token, and nothing else', async () => {
  const auth = authStub('pro-1')
  const calls = []
  const client = createAnimatedIconClient({
    loadAuth: auth.loadAuth,
    fetchImpl: async (url, init) => { calls.push({ url, init }); return { ok: true, status: 200, json: async () => ({ icons: {} }) } },
  })
  await client.collection('line-md')
  await client.glyphs('svg-spinners', ['90-ring', 'bars-fade'])
  assert.equal(calls.length, 2)
  const [listing, glyphs] = calls.map((c) => new URL(c.url, 'https://uil4b.test'))
  assert.equal(listing.pathname, '/api/ai')
  assert.equal(listing.searchParams.get('animatedIcons'), 'line-md')
  assert.equal(listing.searchParams.get('icons'), null)
  assert.equal(glyphs.searchParams.get('animatedIcons'), 'svg-spinners')
  assert.equal(glyphs.searchParams.get('icons'), '90-ring,bars-fade')
  for (const c of calls) {
    assert.ok(c.url.startsWith('/api/ai?'), 'same-origin only')
    assert.ok(!c.url.includes('iconify'), 'no Iconify host')
    assert.equal(c.init.headers.Authorization, 'Bearer token-of-pro-1')
  }
  assert.ok(ANIMATED_BATCH <= 64, 'a batch must fit the server cap')
})

test('signed out, the client makes no request at all', async () => {
  let called = 0
  const client = createAnimatedIconClient({
    loadAuth: authStub(null).loadAuth,
    fetchImpl: async () => { called += 1; return { ok: true, json: async () => ({}) } },
  })
  await assert.rejects(client.glyphs('line-md', ['home']), (e) => e.status === 401)
  await assert.rejects(client.collection('line-md'), (e) => e.status === 401)
  assert.equal(called, 0)
})

test('a 403 from the server surfaces as an error carrying the status', async () => {
  const client = createAnimatedIconClient({
    loadAuth: authStub('free-1').loadAuth,
    fetchImpl: async () => ({ ok: false, status: 403, json: async () => ({ error: 'Pro plan required' }) }),
  })
  await assert.rejects(client.glyphs('line-md', ['home']), (e) => e.status === 403)
})
