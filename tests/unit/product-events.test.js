// The activation funnel sent to Vercel Web Analytics (src/utils/productEvents.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENTS, cleanProps, clearOldMarkers, sendEvent, sendOnce } from '../../src/utils/productEvents.js'
import { read, stripComments } from './helpers/source-text.js'

function memoryStorage() {
  const m = new Map()
  return {
    getItem: (k) => (m.has(k) ? m.get(k) : null),
    setItem: (k, v) => m.set(k, String(v)),
    removeItem: (k) => m.delete(k),
    key: (i) => [...m.keys()][i] ?? null,
    get length() { return m.size },
  }
}

test('properties are allowlisted, short, and never an address', () => {
  assert.deepEqual(
    cleanProps({ tool: 'palette', email: 'a@b.test', uid: 'abc', gate: 'x'.repeat(100), plan: 'someone@x.test' }),
    { tool: 'palette', gate: 'x'.repeat(48) },
  )
  assert.deepEqual(cleanProps(null), {})
})

test('a first_ event is sent once per tab, and nothing is written to storage', () => {
  const sent = []
  const seen = new Set()
  const send = (n, p) => sent.push([n, p])
  assert.equal(sendOnce(EVENTS.firstToolUsed, { tool: 'palette' }, { seen, send }), true)
  assert.equal(sendOnce(EVENTS.firstToolUsed, { tool: 'contrast' }, { seen, send }), false)
  assert.deepEqual(sent, [['first_tool_used', { tool: 'palette' }]])
  const src = stripComments(read('src/utils/productEvents.js'))
  assert.doesNotMatch(src, /setItem\(/, 'productEvents.js writes to browser storage again')
})

test('markers left by earlier builds are removed, and nothing else is', () => {
  const storage = memoryStorage()
  storage.setItem('uil4b-event-once:first_tool_used', '1')
  storage.setItem('uil4b-theme', 'dark')
  clearOldMarkers(storage)
  assert.equal(storage.getItem('uil4b-event-once:first_tool_used'), null)
  assert.equal(storage.getItem('uil4b-theme'), 'dark')
})

test('a failing sender never throws into the product', () => {
  assert.equal(sendEvent('x', {}, { send: () => { throw new Error('blocked') } }), false)
  assert.equal(sendOnce('y', {}, { seen: new Set(), send: () => { throw new Error('blocked') } }), false)
})

// Each event is raised where the thing actually happens. Asserted on the call
// sites, because a helper nobody calls measures nothing.
test('all five events are wired to their moments', () => {
  const at = (file) => stripComments(read(file))
  assert.match(at('src/pages/CreateTool.jsx'), /sendOnce\(EVENTS\.firstToolUsed/)
  assert.match(at('src/utils/analytics.js'), /sendOnce\(EVENTS\.firstCopyExport/)
  assert.match(at('src/utils/analytics.js'), /sendEvent\(EVENTS\.upgradeGateShown/)
  assert.match(at('src/App.jsx'), /sendEvent\(EVENTS\.signUp\)/)
  assert.match(at('src/pages/Checkout.jsx'), /sendEvent\(EVENTS\.checkoutStarted/)
})

test('`from` is kept only for our own surfaces', () => {
  assert.deepEqual(cleanProps({ plan: 'yearly', from: 'kit-gallery' }), { plan: 'yearly', from: 'kit-gallery' })
  assert.deepEqual(cleanProps({ plan: 'yearly', from: 'https://example.test/x' }), { plan: 'yearly' })
})

test('One Tap mounts only on the sign-in and paying routes, in both seams', () => {
  for (const file of ['src/components/oneTapMount.jsx', 'src/components/oneTapMount.lazy.jsx']) {
    assert.match(stripComments(read(file)), /oneTapAllowed\(pathname\)/, `${file} mounts One Tap on every route again`)
  }
})
