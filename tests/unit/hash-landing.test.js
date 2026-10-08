import test from 'node:test'
import assert from 'node:assert/strict'
import { landOnHash } from '../../src/utils/hashLanding.js'

function frames(t) {
  let time = 0
  let next = 0
  const pending = new Map()
  for (const [name, value] of Object.entries({
    requestAnimationFrame: (fn) => { pending.set(++next, fn); return next },
    cancelAnimationFrame: (id) => pending.delete(id),
    document: { getElementById: () => null },
    window: { scrollY: 0, innerHeight: 900 },
    getComputedStyle: () => ({ scrollMarginTop: '88px', scrollPaddingTop: '0px' }),
  })) {
    const descriptor = Object.getOwnPropertyDescriptor(globalThis, name)
    Object.defineProperty(globalThis, name, { configurable: true, writable: true, value })
    t.after(() => {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor)
      else delete globalThis[name]
    })
  }
  t.mock.method(performance, 'now', () => time)
  return {
    pending,
    tick(ms = 16) {
      time += ms
      const callbacks = [...pending.values()]
      pending.clear()
      callbacks.forEach((fn) => fn(time))
    },
  }
}

test('waits for a lazy target, refreshes Lenis and scrolls exactly once', (t) => {
  const clock = frames(t)
  const target = {}
  const calls = []
  const lenis = { resize: () => calls.push('resize'), scrollTo: (...args) => calls.push(args) }
  landOnHash('#lazy%20section', () => lenis)
  clock.tick()
  clock.tick()
  document.getElementById = (id) => { assert.equal(id, 'lazy section'); return target }
  clock.tick()
  assert.deepEqual(calls, ['resize', [target, { immediate: true, force: true }]])
  clock.tick()
  assert.equal(calls.length, 2)
  assert.equal(clock.pending.size, 0)
})

test('native landing is immediate and uses scrollIntoView for CSS margins', (t) => {
  const clock = frames(t)
  const calls = []
  document.getElementById = () => ({ scrollIntoView: (options) => calls.push(options) })
  landOnHash('#faq', () => null)
  clock.tick()
  clock.tick()
  assert.deepEqual(calls, [{ block: 'start', behavior: 'instant' }])
})

test('missing targets stop retrying at two seconds', (t) => {
  const clock = frames(t)
  landOnHash('#missing', () => { assert.fail('no scroller needed without a target') })
  clock.tick()
  clock.tick()
  assert.equal(clock.pending.size, 1)
  clock.tick(1000)
  assert.equal(clock.pending.size, 1)
  clock.tick(968)
  assert.equal(clock.pending.size, 0)
})

test('same-page router hashes land natively unless already aligned', (t) => {
  const clock = frames(t)
  let top = 1200
  const calls = []
  document.documentElement = { scrollHeight: 3000 }
  document.getElementById = () => ({
    getBoundingClientRect: () => ({ top }),
    scrollIntoView: (options) => calls.push(options),
  })
  landOnHash('#faq', () => null, true)
  clock.tick()
  clock.tick()
  assert.deepEqual(calls, [{ block: 'start', behavior: 'instant' }])
  top = 88
  landOnHash('#faq', () => null, true)
  clock.tick()
  clock.tick()
  assert.equal(calls.length, 1)
})

test('same-page fallback does not restart Lenis anchor scrolling', (t) => {
  const clock = frames(t)
  document.documentElement = { scrollHeight: 3000 }
  document.getElementById = () => ({ getBoundingClientRect: () => ({ top: 1200 }) })
  const lenis = {
    targetScroll: 1112,
    resize: () => assert.fail('anchor scroll already has the correct destination'),
    scrollTo: () => assert.fail('must not restart anchor scroll'),
  }
  landOnHash('#faq', () => lenis, true)
  clock.tick()
  clock.tick()
  assert.equal(clock.pending.size, 0)
})

test('same-page router hashes use Lenis when no anchor scroll handled them', (t) => {
  const clock = frames(t)
  document.documentElement = { scrollHeight: 3000 }
  const target = { getBoundingClientRect: () => ({ top: 1200 }) }
  document.getElementById = () => target
  const calls = []
  const lenis = {
    targetScroll: 0,
    resize: () => calls.push('resize'),
    scrollTo: (...args) => calls.push(args),
  }
  landOnHash('#faq', () => lenis, true)
  clock.tick()
  clock.tick()
  assert.deepEqual(calls, ['resize', [target, { immediate: true, force: true }]])
})

test('cleanup cancels both the initial frame and a pending retry', (t) => {
  const clock = frames(t)
  const cancel = landOnHash('#faq', () => null)
  cancel()
  assert.equal(clock.pending.size, 0)
  const cancelRetry = landOnHash('#faq', () => null)
  clock.tick()
  clock.tick()
  assert.equal(clock.pending.size, 1)
  cancelRetry()
  assert.equal(clock.pending.size, 0)
})

test('empty hashes schedule nothing and malformed encoding does not throw', (t) => {
  const clock = frames(t)
  landOnHash('', () => null)()
  assert.equal(clock.pending.size, 0)
  const cancel = landOnHash('#bad%', () => null)
  clock.tick()
  clock.tick()
  cancel()
  assert.equal(clock.pending.size, 0)
})
