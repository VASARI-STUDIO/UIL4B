// A lazy page whose file failed to download: src/utils/lazyRoute.js.
//
// When main.jsx's `vite:preloadError` listener takes a failure over and starts
// a reload, Vite's preload helper resolves the `import()` with `undefined`.
// These tests drive React's own `lazy()` through the hook React calls while
// rendering (`_init(_payload)`): it throws a thenable while the import is
// pending, returns the component once it has arrived, and throws an Error if
// the import settled into something it cannot use.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { lazy } from 'react'
import {
  lazyRoute, settleRouteModule, handlePreloadError, chunkReloadPending, isChunkLoadError,
  CHUNK_RELOAD_KEY, RELOAD_GUARD_MS, RELOAD_GRACE_MS,
} from '../../src/utils/lazyRoute.js'
import { stripJs } from '../helpers/strip-comments.js'

const tick = () => new Promise((r) => setTimeout(r, 0))
const noTimer = () => {}

/** What React gets when it renders this lazy component right now. */
function renderOnce(component) {
  try {
    return { value: component._init(component._payload) }
  } catch (thrown) {
    if (thrown && typeof thrown.then === 'function') return { pending: true }
    return { error: thrown }
  }
}

function memoryStorage(initial = {}) {
  const m = new Map(Object.entries(initial))
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), m }
}

function fakeEvent() {
  return { prevented: false, preventDefault() { this.prevented = true } }
}

const CHUNK_FAILURE = 'Failed to fetch dynamically imported module: https://example.test/assets/Credits-Bv60jtlr.js'

/** Start a recovery reload now, as main.jsx's listener does on a first failure. */
function startReload() {
  assert.equal(handlePreloadError(fakeEvent(), { online: true, storage: memoryStorage(), now: Date.now(), reload: () => {} }), true)
}

/** Let a page's grace run out, which is how a reload that never landed ends. */
async function endReload() {
  await settleRouteModule(undefined, { graceMs: 0 }).catch(() => {})
}

// ── The failure, with React's own lazy() ──────────────────────────────────────

test('control: React lazy() given an import that resolved with nothing throws, which is the crash', async () => {
  const Page = lazy(() => Promise.resolve(undefined))
  assert.equal(renderOnce(Page).pending, true)
  await tick()
  const second = renderOnce(Page)
  assert.ok(second.error instanceof Error,
    'React lazy() no longer throws on an undefined module, so the condition this file guards may be gone')
})

test('lazyRoute() keeps a page whose import resolved with nothing pending, so Suspense holds its fallback', async () => {
  const Page = lazyRoute(() => Promise.resolve(undefined), { setTimer: noTimer })
  assert.equal(renderOnce(Page).pending, true)
  await tick()
  const second = renderOnce(Page)
  assert.equal(second.error, undefined,
    `the page threw ${second.error && second.error.message} instead of waiting for the reload`)
  assert.equal(second.pending, true, 'the page must still be pending while the reload is in flight')
})

test('lazyRoute() renders a page that arrived, exactly as lazy() does', async () => {
  const Component = () => null
  const Page = lazyRoute(() => Promise.resolve({ default: Component }), { setTimer: noTimer })
  renderOnce(Page)
  await tick()
  assert.equal(renderOnce(Page).value, Component)
})

test('a reload that never lands becomes a chunk-load error, not a spinner that never ends', async () => {
  await assert.rejects(settleRouteModule(undefined, { graceMs: 5 }), (err) => {
    assert.equal(isChunkLoadError(err), true, `not recognised as a chunk-load failure: ${err.message}`)
    return true
  })
})

// ── Which errors mean "the code never arrived" ────────────────────────────────

test('chunk-load failures are told apart from code that arrived and threw', () => {
  for (const message of [
    'Failed to fetch dynamically imported module: https://example.test/assets/Credits-Bv60jtlr.js',
    'Importing a module script failed.',
    'error loading dynamically imported module: https://example.test/assets/Credits-Bv60jtlr.js',
    'Unable to preload CSS for /assets/SurfaceIndex-bdUDG-8n.css',
  ]) {
    assert.equal(isChunkLoadError(new TypeError(message)), true, message)
    assert.equal(isChunkLoadError(message), true, `as a string: ${message}`)
  }
  for (const message of [
    "Cannot read properties of undefined (reading 'default')",
    "Cannot read properties of undefined (reading 'join')",
    'probe crash for the recovery screen',
  ]) {
    assert.equal(isChunkLoadError(new TypeError(message)), false, message)
  }
  assert.equal(isChunkLoadError(null), false)
  assert.equal(isChunkLoadError(undefined), false)
})

// ── The reload, and the guard that stops it looping ───────────────────────────

test('the first failure online takes the error over and reloads once', () => {
  assert.equal(chunkReloadPending(), false, 'nothing has reloaded yet in this process')
  const storage = memoryStorage()
  const event = fakeEvent()
  let reloads = 0
  const took = handlePreloadError(event, { online: true, storage, now: 1e12, reload: () => { reloads += 1 } })
  assert.equal(took, true)
  assert.equal(event.prevented, true, 'the error must be swallowed while the reload runs')
  assert.equal(reloads, 1)
  assert.equal(storage.getItem(CHUNK_RELOAD_KEY), String(1e12))
  assert.equal(chunkReloadPending(1e12), true, 'the reporter must be able to see the reload is in flight')
})

test('a reload counts as in flight for its grace period, not for the rest of the page', () => {
  handlePreloadError(fakeEvent(), { online: true, storage: memoryStorage(), now: 1e12, reload: () => {} })
  assert.equal(chunkReloadPending(1e12 + RELOAD_GRACE_MS - 1), true)
  assert.equal(chunkReloadPending(1e12 + RELOAD_GRACE_MS), false,
    'a reload that never replaced the document still counts as in flight')
})

test('when a page gives up waiting for its reload, the reload stops counting as in flight', async () => {
  startReload()
  assert.equal(chunkReloadPending(), true)
  await assert.rejects(settleRouteModule(undefined, { graceMs: 5 }))
  assert.equal(chunkReloadPending(), false,
    'the page shows its retry state, but its chunk failure would still be held back from the report')
})

// ── A second failure for the same import, while the reload is in flight ──────

test('an import that rejects with a chunk failure while the reload is in flight stays pending', async () => {
  startReload()
  const Page = lazyRoute(() => Promise.reject(new TypeError(CHUNK_FAILURE)), { setTimer: noTimer })
  assert.equal(renderOnce(Page).pending, true)
  await tick()
  const second = renderOnce(Page)
  assert.equal(second.error, undefined,
    `the page threw ${second.error && second.error.message} while its reload was in flight`)
  assert.equal(second.pending, true)
  await endReload()
})

test('with no reload in flight, a chunk failure goes through to the boundary', async () => {
  await endReload()
  const Page = lazyRoute(() => Promise.reject(new TypeError(CHUNK_FAILURE)), { setTimer: noTimer })
  renderOnce(Page)
  await tick()
  const second = renderOnce(Page)
  assert.ok(second.error && isChunkLoadError(second.error), 'the failure should reach the boundary as a load failure')
})

test('a code error is never held, even while a reload is in flight', async () => {
  startReload()
  const Page = lazyRoute(() => Promise.reject(new TypeError("Cannot read properties of undefined (reading 'join')")), { setTimer: noTimer })
  renderOnce(Page)
  await tick()
  const second = renderOnce(Page)
  assert.ok(second.error instanceof TypeError, 'a module that threw while loading was held as if it were a download failure')
  await endReload()
})

test('a second failure inside the guard window does not reload again', () => {
  const storage = memoryStorage({ [CHUNK_RELOAD_KEY]: String(1e12) })
  const event = fakeEvent()
  let reloads = 0
  const env = { online: true, storage, reload: () => { reloads += 1 } }
  assert.equal(handlePreloadError(event, { ...env, now: 1e12 + RELOAD_GUARD_MS - 1 }), false)
  assert.equal(event.prevented, false, 'the error must reach the page so it can show the retry state')
  assert.equal(reloads, 0, 'reloaded again inside the guard window: this is the reload loop')
  // ...and once the window has passed, a new failure gets its own reload.
  assert.equal(handlePreloadError(fakeEvent(), { ...env, now: 1e12 + RELOAD_GUARD_MS }), true)
  assert.equal(reloads, 1)
})

test('offline, the error goes through and nothing reloads', () => {
  const storage = memoryStorage()
  const event = fakeEvent()
  let reloads = 0
  assert.equal(handlePreloadError(event, { online: false, storage, now: 1e12, reload: () => { reloads += 1 } }), false)
  assert.equal(event.prevented, false)
  assert.equal(reloads, 0)
  assert.equal(storage.getItem(CHUNK_RELOAD_KEY), null, 'offline must not use up the reload')
})

test('storage that cannot hold the guard never reloads, so it can never loop', () => {
  let reloads = 0
  const event = fakeEvent()
  const storage = { getItem: () => { throw new Error('denied') }, setItem: () => { throw new Error('denied') } }
  assert.equal(handlePreloadError(event, { online: true, storage, now: 1e12, reload: () => { reloads += 1 } }), false)
  assert.equal(event.prevented, false)
  assert.equal(reloads, 0)
})

// ── Wiring ────────────────────────────────────────────────────────────────────

function sourceFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((d) => {
    const p = path.join(dir, d.name)
    if (d.isDirectory()) return sourceFiles(p)
    return /\.(jsx?|mjs)$/.test(d.name) ? [p] : []
  })
}

test('no file in src takes lazy() from React: every code-split component goes through lazyRoute', () => {
  let callers = 0
  for (const file of sourceFiles('src')) {
    if (file.endsWith(path.join('utils', 'lazyRoute.js'))) continue
    const src = stripJs(fs.readFileSync(file, 'utf8'))
    const fromReact = src.match(/import\s*(?:\w+\s*,\s*)?\{([^}]*)\}\s*from\s*['"]react['"]/)
    assert.ok(!fromReact || !/\blazy\b/.test(fromReact[1]),
      `${file} imports React's lazy, so a failed download there crashes again`)
    assert.ok(!/\bReact\.lazy\(/.test(src), `${file} calls React.lazy`)
    if (/\blazy\(/.test(src)) {
      assert.match(src, /import\s*\{\s*lazyRoute\s+as\s+lazy\s*\}\s*from\s*['"][./]+(?:utils\/)?lazyRoute['"]/,
        `${file} calls lazy() without importing it from utils/lazyRoute`)
      callers += 1
    }
  }
  assert.ok(callers >= 7, `only ${callers} files call lazy(), so this check may be reading the wrong tree`)
})

test("main.jsx hands vite:preloadError to the guarded handler", () => {
  const src = stripJs(fs.readFileSync('src/main.jsx', 'utf8'))
  const listener = /addEventListener\(\s*'vite:preloadError'[\s\S]*?\n\}\)/.exec(src)?.[0] || ''
  assert.ok(listener, 'the vite:preloadError listener is gone')
  assert.match(listener, /handlePreloadError\(/)
  assert.ok(!/preventDefault\(\)/.test(listener),
    'the listener calls preventDefault itself, outside the guard')
})
