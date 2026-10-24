// The shared page scroll lock (src/utils/scrollLock.js).
//
// Every surface that covers the page — dialogs, the full-screen menus, the side
// panels — takes this one lock, so what it promises is tested on its own: the
// first lock applies, the last unlock releases, nesting holds in between, an
// unlock only counts once, and Lenis is stopped and started once each.
//
// The module imports getLenis, and the hook it comes from cannot be imported by
// `node --test` (an extensionless import further up the chain), so the real
// source is run in a vm with only that import stubbed. Each load gets a fresh
// module, so the depth counter starts at zero.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import vm from 'node:vm'

const LOCK_PATH = 'src/utils/scrollLock.js'
const source = fs.readFileSync(path.join(process.cwd(), LOCK_PATH), 'utf8')

function load({ lenis = true } = {}) {
  const root = { style: { overflow: '', scrollbarGutter: '' } }
  const body = { style: { overflow: '' } }
  const stub = { stopped: 0, started: 0, stop() { this.stopped += 1 }, start() { this.started += 1 } }

  assert.match(source, /import \{ getLenis \} from '\.\.\/hooks\/useSmoothScroll\.js'/,
    'the Lenis import changed shape; update this loader so the real source still runs')
  assert.match(source, /^export function lockScroll/m, 'lockScroll is no longer exported')
  const code = source
    .replace(/import \{ getLenis \} from '\.\.\/hooks\/useSmoothScroll\.js'/, '')
    .replace(/^export function lockScroll/m, 'function lockScroll')
  const lockScroll = vm.runInNewContext(`(function(){\n${code}\n;return lockScroll;\n})()`, {
    document: { documentElement: root, body },
    getLenis: () => (lenis ? stub : null),
  }, { filename: LOCK_PATH })

  return { lockScroll, root, body, stub }
}

test('the first lock sets the root overflow and the last unlock clears it', () => {
  const { lockScroll, root, body } = load()
  assert.equal(root.overflow, '')
  const unlock = lockScroll()
  assert.equal(root.overflow, 'hidden', 'the root was not locked')
  assert.equal(body.style.overflow, '', 'the lock went on <body>, which the root overflow-x: clip makes its own scroll box')
  unlock()
  assert.equal(root.overflow, '', 'the root lock was not released')
})

test('scrollbar-gutter is never touched', () => {
  const { lockScroll, root } = load()
  const unlock = lockScroll()
  assert.equal(root.style?.scrollbarGutter ?? root.scrollbarGutter, undefined)
  assert.equal(root.style.scrollbarGutter, '', 'reserving the gutter grew the page at phone widths')
  unlock()
  assert.equal(root.style.scrollbarGutter, '')
})

test('nested locks hold until the last one is released, in any order', () => {
  const { lockScroll, root } = load()
  const outer = lockScroll()
  const inner = lockScroll()
  inner()
  assert.equal(root.overflow, 'hidden', 'closing the inner surface released the outer lock')
  outer()
  assert.equal(root.overflow, '')

  const a = lockScroll()
  const b = lockScroll()
  a()
  assert.equal(root.overflow, 'hidden', 'closing the outer one first released the lock under the inner one')
  b()
  assert.equal(root.overflow, '')
})

test('unlocking twice is harmless and does not release someone else\'s lock', () => {
  const { lockScroll, root, stub } = load()
  const first = lockScroll()
  const second = lockScroll()
  first()
  first()
  assert.equal(root.overflow, 'hidden', 'a repeated unlock took the other surface\'s lock with it')
  second()
  second()
  assert.equal(root.overflow, '')
  assert.equal(stub.started, 1, 'Lenis was started more than once')

  // And the count has not gone negative: the next lock still applies.
  const again = lockScroll()
  assert.equal(root.overflow, 'hidden')
  again()
  assert.equal(root.overflow, '')
})

test('Lenis is stopped once on the first lock and started once on the last unlock', () => {
  const { lockScroll, stub } = load()
  const a = lockScroll()
  const b = lockScroll()
  const c = lockScroll()
  assert.equal(stub.stopped, 1, 'Lenis was stopped again by a nested lock')
  assert.equal(stub.started, 0)
  c()
  b()
  assert.equal(stub.started, 0, 'Lenis restarted while a surface was still open')
  a()
  assert.equal(stub.stopped, 1)
  assert.equal(stub.started, 1, 'Lenis was never restarted — the page is frozen for good')
})

test('with no Lenis (reduced motion) the root lock still holds and nothing throws', () => {
  const { lockScroll, root } = load({ lenis: false })
  const unlock = lockScroll()
  assert.equal(root.overflow, 'hidden')
  assert.doesNotThrow(() => unlock())
  assert.equal(root.overflow, '')
})
