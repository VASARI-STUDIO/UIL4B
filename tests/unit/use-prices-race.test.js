// usePrices reads its cache through useSyncExternalStore with a version
// snapshot. A component that rendered before the fetch settled, and subscribed
// after it, reads a different version on subscribing and renders again. A
// useState + useEffect pair would miss that settle and stay on "loading".
import test from 'node:test'
import assert from 'node:assert/strict'
import { read, stripComments } from './helpers/source-text.js'

const src = stripComments(read('src/hooks/usePrices.js'))

test('usePrices subscribes through useSyncExternalStore, not an effect', () => {
  assert.match(src, /useSyncExternalStore\(subscribe, getSnapshot/)
  const hook = src.slice(src.indexOf('export function usePrices'), src.indexOf('export function usePriceRetry'))
  assert.doesNotMatch(hook, /useEffect|force\(/, 'the subscribe-after-settle race is back')
})

test('the snapshot is a version that rises on every settle and every refresh', () => {
  assert.match(src, /const getSnapshot = \(\) => version/)
  assert.match(src, /function bump\(\) \{\s*version \+= 1/)
  const settle = src.slice(src.indexOf('.finally('), src.indexOf('return inflight\n}'))
  assert.match(settle, /bump\(\)/, 'a settle does not bump the version')
  const refresh = src.slice(src.indexOf('export function refreshPrices'), src.indexOf('function subscribe'))
  assert.match(refresh, /bump\(\)/, 'refreshPrices does not bump the version')
})

test('subscribing starts the fetch when there is no cache', () => {
  const subscribe = src.slice(src.indexOf('function subscribe'), src.indexOf('const getSnapshot'))
  assert.match(subscribe, /if \(!priceCache\) fetchPricesOnce\(\)/)
})

// ── The store itself, driven without a renderer ──────────────────────────────
// subscribeToPrices / getPricesSnapshot are the two halves React calls. The
// module's state is shared, so the steps below run in order in one test.

test('a settle between the render-time read and the subscribe is seen, and an unsubscribed callback is never called', async () => {
  const { register } = await import('node:module')
  register('./helpers/stub-loader.mjs', import.meta.url, { data: { queueApi: false } })
  const store = await import('../../src/hooks/usePrices.js')

  const answer = { monthly: { usd: 7 }, yearly: { usd: 48 }, source: { monthly: 'live', yearly: 'live' }, currencyAvailability: { monthly: { usd: true }, yearly: { usd: true } } }
  let fetches = 0
  let release
  globalThis.fetch = () => {
    fetches += 1
    return new Promise((resolve) => { release = () => resolve({ ok: true, json: async () => answer }) })
  }

  // A component renders and reads the snapshot, before anything has settled.
  const renderedAt = store.getPricesSnapshot()

  // Another subscriber starts the fetch; the first component has not subscribed yet.
  const early = []
  const stopEarly = store.subscribeToPrices(() => early.push(store.getPricesSnapshot()))
  assert.equal(fetches, 1, 'subscribing with no cache starts the fetch')
  release()
  await new Promise((resolve) => setImmediate(resolve))
  assert.equal(early.length, 1, 'the settle reaches a subscriber once')

  // The late subscribe finds a snapshot unlike the one it rendered with, which
  // is what makes React render again with the settled prices.
  const lateCalls = []
  const stopLate = store.subscribeToPrices(() => lateCalls.push(1))
  assert.notEqual(store.getPricesSnapshot(), renderedAt, 'a settle that landed before the subscribe left the snapshot unchanged')
  assert.equal(fetches, 1, 'a cached answer is not fetched again')

  // A refresh moves the snapshot for everyone still subscribed.
  const before = store.getPricesSnapshot()
  stopEarly()
  const refreshed = store.refreshPrices()
  assert.notEqual(store.getPricesSnapshot(), before, 'a refresh did not move the snapshot')
  release()
  await refreshed
  assert.equal(early.length, 1, 'an unsubscribed callback was called after it left')
  assert.ok(lateCalls.length >= 2, 'a subscriber missed the refresh or its settle')
  stopLate()
})

test('a Retry that settles after the component has gone sets no state', () => {
  const retry = src.slice(src.indexOf('export function usePriceRetry'), src.indexOf('export function useProPrice'))
  assert.match(retry, /useEffect\(\(\) => \{\s*mounted\.current = true\s*return \(\) => \{ mounted\.current = false \}/, 'the mounted flag is not cleared on unmount')
  assert.match(retry, /request\.finally\(\(\) => \{ if \(mounted\.current\) setRetrying\(false\) \}\)/, 'the settle sets state without checking the component is still there')
})
