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
