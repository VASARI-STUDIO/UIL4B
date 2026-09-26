// The activation funnel sent to Vercel Web Analytics (src/utils/productEvents.js).
import test from 'node:test'
import assert from 'node:assert/strict'
import { EVENTS, cleanProps, sendEvent, sendOnce } from '../../src/utils/productEvents.js'
import { read, stripComments } from './helpers/source-text.js'

function memoryStorage() {
  const m = new Map()
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)) }
}

test('properties are allowlisted, short, and never an address', () => {
  assert.deepEqual(
    cleanProps({ tool: 'palette', email: 'a@b.test', uid: 'abc', gate: 'x'.repeat(100), plan: 'someone@x.test' }),
    { tool: 'palette', gate: 'x'.repeat(48) },
  )
  assert.deepEqual(cleanProps(null), {})
})

test('a first_ event is sent once per browser', () => {
  const sent = []
  const storage = memoryStorage()
  const send = (n, p) => sent.push([n, p])
  assert.equal(sendOnce(EVENTS.firstToolUsed, { tool: 'palette' }, { storage, send }), true)
  assert.equal(sendOnce(EVENTS.firstToolUsed, { tool: 'contrast' }, { storage, send }), false)
  assert.deepEqual(sent, [['first_tool_used', { tool: 'palette' }]])
})

test('a failing sender or storage never throws into the product', () => {
  assert.equal(sendEvent('x', {}, { send: () => { throw new Error('blocked') } }), false)
  const storage = { getItem: () => { throw new Error('denied') }, setItem() {} }
  assert.equal(sendOnce('y', {}, { storage, send: () => {} }), false)
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
